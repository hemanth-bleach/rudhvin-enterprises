import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../../data/rudhvin_store.json');

// In-memory collection registry
const collections = {
  users: [],
  companies: [],
  customers: [],
  products: [],
  invoices: [],
  payments: [],
  invoicesequences: [],
  auditlogs: []
};

// Persistent sync to disk
function saveToDisk() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(collections, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[EmbeddedDB] Failed to save database to disk:', err.message);
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      Object.keys(data).forEach(col => {
        collections[col] = data[col] || [];
      });
      console.log('✅ [EmbeddedDB] Loaded persistent data from disk');
    }
  } catch (err) {
    console.warn('[EmbeddedDB] Could not load database from disk, starting fresh:', err.message);
  }
}

// Generate MongoDB-compatible ObjectId string
export function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

// Query matcher helper
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.');
  let val = obj;
  for (const p of parts) {
    if (val === null || val === undefined) return undefined;
    val = val[p];
  }
  return val;
}

function evaluateCondition(doc, condition) {
  if (!condition || typeof condition !== 'object') return Boolean(condition);
  if (condition.$gt) {
    const [fieldRef, comp] = condition.$gt;
    const val = Number(getNestedValue(doc, fieldRef.startsWith('$') ? fieldRef.slice(1) : fieldRef)) || 0;
    return val > comp;
  }
  if (condition.$gte) {
    const [fieldRef, comp] = condition.$gte;
    const val = Number(getNestedValue(doc, fieldRef.startsWith('$') ? fieldRef.slice(1) : fieldRef)) || 0;
    return val >= comp;
  }
  if (condition.$lt) {
    const [fieldRef, comp] = condition.$lt;
    const val = Number(getNestedValue(doc, fieldRef.startsWith('$') ? fieldRef.slice(1) : fieldRef)) || 0;
    return val < comp;
  }
  if (condition.$lte) {
    const [fieldRef, comp] = condition.$lte;
    const val = Number(getNestedValue(doc, fieldRef.startsWith('$') ? fieldRef.slice(1) : fieldRef)) || 0;
    return val <= comp;
  }
  if (condition.$eq) {
    const [fieldRef, comp] = condition.$eq;
    const rawVal = getNestedValue(doc, fieldRef.startsWith('$') ? fieldRef.slice(1) : fieldRef);
    return rawVal === comp || Number(rawVal) === Number(comp);
  }
  if (condition.$ne) {
    const [fieldRef, comp] = condition.$ne;
    const rawVal = getNestedValue(doc, fieldRef.startsWith('$') ? fieldRef.slice(1) : fieldRef);
    return rawVal !== comp && Number(rawVal) !== Number(comp);
  }
  return false;
}

function resolveExprValue(doc, expr) {
  if (typeof expr === 'string' && expr.startsWith('$')) {
    return Number(getNestedValue(doc, expr.slice(1))) || 0;
  }
  return Number(expr) || 0;
}

// Query matcher
function matchesQuery(doc, query = {}) {
  for (const [key, val] of Object.entries(query)) {
    if (key === '$or' && Array.isArray(val)) {
      const anyMatch = val.some(subQuery => matchesQuery(doc, subQuery));
      if (!anyMatch) return false;
      continue;
    }

    // Support nested keys like 'customerSnapshot.name'
    const docVal = getNestedValue(doc, key);

    if (val instanceof RegExp) {
      if (!val.test(String(docVal || ''))) return false;
    } else if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      // Comparison operators
      if (val.$nin !== undefined) {
        const docValStr = String(docVal?._id || docVal || '');
        const inMatch = val.$nin.some(item => String(item?._id || item || '') === docValStr);
        if (inMatch) return false;
      }
      if (val.$in !== undefined) {
        const docValStr = String(docVal?._id || docVal || '');
        const inMatch = val.$in.some(item => String(item?._id || item || '') === docValStr);
        if (!inMatch) return false;
      }
      if (val.$ne !== undefined) {
        const docValStr = String(docVal?._id || docVal || '');
        const neValStr = String(val.$ne?._id || val.$ne || '');
        if (docValStr === neValStr) return false;
      }
      if (val.$gt !== undefined) {
        const cmpVal = val.$gt instanceof Date ? new Date(docVal) : docVal;
        if (!(cmpVal > val.$gt)) return false;
      }
      if (val.$gte !== undefined) {
        const cmpVal = val.$gte instanceof Date ? new Date(docVal) : docVal;
        if (!(cmpVal >= val.$gte)) return false;
      }
      if (val.$lt !== undefined) {
        const cmpVal = val.$lt instanceof Date ? new Date(docVal) : docVal;
        if (!(cmpVal < val.$lt)) return false;
      }
      if (val.$lte !== undefined) {
        const cmpVal = val.$lte instanceof Date ? new Date(docVal) : docVal;
        if (!(cmpVal <= val.$lte)) return false;
      }
    } else {
      if (docVal === val) continue;
      const dStr = docVal?._id !== undefined ? String(docVal._id) : (docVal !== null && docVal !== undefined ? String(docVal) : '');
      const vStr = val?._id !== undefined ? String(val._id) : (val !== null && val !== undefined ? String(val) : '');
      if (dStr !== vStr) {
        return false;
      }
    }
  }
  return true;
}

// Clone helper
function deepClone(obj) {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// Wrap doc with .save(), .deleteOne(), and .toObject()
function wrapDoc(collectionName, rawDoc) {
  if (!rawDoc) return null;
  const doc = deepClone(rawDoc);

  Object.defineProperty(doc, 'save', {
    enumerable: false,
    value: async function () {
      doc.updatedAt = new Date().toISOString();
      const idx = collections[collectionName].findIndex(d => String(d._id) === String(doc._id));
      if (idx >= 0) {
        collections[collectionName][idx] = deepClone(doc);
      } else {
        collections[collectionName].push(deepClone(doc));
      }
      saveToDisk();
      return this;
    }
  });

  Object.defineProperty(doc, 'deleteOne', {
    enumerable: false,
    value: async function () {
      const idx = collections[collectionName].findIndex(d => String(d._id) === String(doc._id));
      if (idx >= 0) {
        collections[collectionName].splice(idx, 1);
        saveToDisk();
      }
      return this;
    }
  });

  Object.defineProperty(doc, 'toObject', {
    enumerable: false,
    value: function () {
      return deepClone(this);
    }
  });

  return doc;
}

// Chainable query builder
class QueryBuilder {
  constructor(collectionName, query = {}) {
    this.collectionName = collectionName;
    this.query = query;
    this._sort = null;
    this._skip = 0;
    this._limit = 0;
    this._populateFields = [];
    this._selectFields = null;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  skip(n) {
    this._skip = n;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  populate(field, select) {
    this._populateFields.push({ field, select });
    return this;
  }

  select(fields) {
    this._selectFields = fields;
    return this;
  }

  lean() {
    return this;
  }

  async exec() {
    let list = (collections[this.collectionName] || []).filter(d => matchesQuery(d, this.query));

    // Sort
    if (this._sort) {
      const sortEntries = typeof this._sort === 'string'
        ? this._sort.split(' ').filter(Boolean).map(s => s.startsWith('-') ? [s.slice(1), -1] : [s, 1])
        : Object.entries(this._sort);
      list.sort((a, b) => {
        for (const [field, dir] of sortEntries) {
          const direction = (dir === -1 || dir === 'desc') ? -1 : 1;
          const aRaw = getNestedValue(a, field);
          const bRaw = getNestedValue(b, field);
          const valA = aRaw instanceof Date ? aRaw.getTime() : aRaw;
          const valB = bRaw instanceof Date ? bRaw.getTime() : bRaw;
          if (valA < valB) return -1 * direction;
          if (valA > valB) return 1 * direction;
        }
        return 0;
      });
    }

    // Skip
    if (this._skip > 0) {
      list = list.slice(this._skip);
    }

    // Limit
    if (this._limit > 0) {
      list = list.slice(0, this._limit);
    }

    // Populate
    if (this._populateFields.length > 0) {
      list = list.map(item => {
        const cloned = deepClone(item);
        this._populateFields.forEach(({ field }) => {
          if (field === 'customer' && cloned.customer) {
            const cust = collections.customers.find(c => String(c._id) === String(cloned.customer));
            if (cust) cloned.customer = deepClone(cust);
          }
          if (field === 'invoice' && cloned.invoice) {
            const inv = collections.invoices.find(i => String(i._id) === String(cloned.invoice));
            if (inv) cloned.invoice = deepClone(inv);
          }
          if ((field === 'user' || field === 'createdBy' || field === 'updatedBy') && cloned[field]) {
            const u = collections.users.find(x => String(x._id) === String(cloned[field]));
            if (u) {
              const { password, ...safeUser } = u;
              cloned[field] = deepClone(safeUser);
            }
          }
        });
        return cloned;
      });
    }

    return list.map(d => wrapDoc(this.collectionName, d));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

// Create collection model
export function createEmbeddedModel(collectionName, schemaDefaults = {}, methods = {}) {
  const colName = collectionName.toLowerCase();
  if (!collections[colName]) {
    collections[colName] = [];
  }

  const Model = function (docData = {}) {
    const doc = {
      _id: generateObjectId(),
      ...deepClone(schemaDefaults),
      ...deepClone(docData),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    Object.assign(doc, methods);
    return wrapDoc(colName, doc);
  };

  Model.find = function (query = {}) {
    return new QueryBuilder(colName, query);
  };

  Model.findOne = function (query = {}) {
    const qb = new QueryBuilder(colName, query);
    const origExec = qb.exec.bind(qb);
    qb.exec = async () => {
      const list = await origExec();
      return list.length > 0 ? list[0] : null;
    };
    return qb;
  };

  Model.findById = function (id) {
    return Model.findOne({ _id: String(id) });
  };

  Model.countDocuments = async function (query = {}) {
    const list = (collections[colName] || []).filter(d => matchesQuery(d, query));
    return list.length;
  };

  Model.create = async function (data) {
    const item = Model(data);
    await item.save();
    return item;
  };

  Model.findOneAndUpdate = async function (query, update, options = {}) {
    let doc = (collections[colName] || []).find(d => matchesQuery(d, query));

    if (!doc && options.upsert) {
      doc = {
        _id: generateObjectId(),
        ...deepClone(schemaDefaults),
        ...deepClone(query),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (update.$setOnInsert) {
        Object.assign(doc, deepClone(update.$setOnInsert));
      }
      collections[colName].push(doc);
    }

    if (doc) {
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          doc[k] = (Number(doc[k]) || 0) + Number(v);
        }
      }
      if (update.$set) {
        Object.assign(doc, deepClone(update.$set));
      }
      doc.updatedAt = new Date().toISOString();
      saveToDisk();
      return wrapDoc(colName, doc);
    }

    return null;
  };

  Model.findByIdAndUpdate = function (id, update, options = {}) {
    return Model.findOneAndUpdate({ _id: String(id) }, update, options);
  };

  Model.deleteOne = async function (query = {}) {
    const idx = (collections[colName] || []).findIndex(d => matchesQuery(d, query));
    if (idx >= 0) {
      collections[colName].splice(idx, 1);
      saveToDisk();
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  };

  Model.deleteMany = async function (query = {}) {
    const before = collections[colName]?.length || 0;
    collections[colName] = (collections[colName] || []).filter(d => !matchesQuery(d, query));
    saveToDisk();
    return { deletedCount: before - collections[colName].length };
  };

  Model.aggregate = async function (pipeline = []) {
    let list = deepClone(collections[colName] || []);

    for (const stage of pipeline) {
      if (stage.$match) {
        list = list.filter(d => matchesQuery(d, stage.$match));
      } else if (stage.$group) {
        const { _id, ...accumulators } = stage.$group;
        const groups = {};

        list.forEach(doc => {
          let groupKey = '_default';
          if (_id !== null) {
            if (typeof _id === 'string' && _id.startsWith('$')) {
              groupKey = String(getNestedValue(doc, _id.slice(1)) || '');
            } else if (typeof _id === 'object') {
              const keyObj = {};
              if (_id.year) {
                keyObj.year = new Date(doc.invoiceDate).getFullYear();
              }
              if (_id.month) {
                keyObj.month = new Date(doc.invoiceDate).getMonth() + 1;
              }
              groupKey = JSON.stringify(keyObj);
            }
          }

          if (!groups[groupKey]) {
            groups[groupKey] = {
              _id: typeof _id === 'object' && _id !== null ? JSON.parse(groupKey) : (_id === null ? null : groupKey),
              _firstDoc: doc
            };
            for (const [accKey, accExpr] of Object.entries(accumulators)) {
              groups[groupKey][accKey] = 0;
            }
          }

          for (const [accKey, accExpr] of Object.entries(accumulators)) {
            if (accExpr.$sum !== undefined) {
              if (accExpr.$sum === 1) {
                groups[groupKey][accKey] += 1;
              } else if (typeof accExpr.$sum === 'string' && accExpr.$sum.startsWith('$')) {
                const val = getNestedValue(doc, accExpr.$sum.slice(1));
                groups[groupKey][accKey] += Number(val || 0);
              } else if (accExpr.$sum && accExpr.$sum.$cond) {
                const cond = accExpr.$sum.$cond;
                let isMatch = false;
                let trueVal = 0;
                let falseVal = 0;

                if (Array.isArray(cond)) {
                  isMatch = evaluateCondition(doc, cond[0]);
                  trueVal = resolveExprValue(doc, cond[1]);
                  falseVal = resolveExprValue(doc, cond[2]);
                } else if (cond.if) {
                  isMatch = evaluateCondition(doc, cond.if);
                  trueVal = resolveExprValue(doc, cond.then);
                  falseVal = resolveExprValue(doc, cond.else);
                }

                groups[groupKey][accKey] += isMatch ? trueVal : falseVal;
              }
            } else if (accExpr.$first !== undefined) {
              const val = getNestedValue(doc, accExpr.$first.slice(1));
              if (groups[groupKey][accKey] === 0 || groups[groupKey][accKey] === undefined) {
                groups[groupKey][accKey] = val || '';
              }
            }
          }
        });

        // Round all numeric accumulator results to 2 decimals
        for (const grp of Object.values(groups)) {
          for (const [k, v] of Object.entries(grp)) {
            if (typeof v === 'number') {
              grp[k] = Math.round((v + Number.EPSILON) * 100) / 100;
            }
          }
        }

        list = Object.values(groups);
      } else if (stage.$sort) {
        const sortEntries = Object.entries(stage.$sort);
        list.sort((a, b) => {
          for (const [field, dir] of sortEntries) {
            const direction = dir === -1 || dir === 'desc' ? -1 : 1;
            const aRaw = getNestedValue(a, field);
            const bRaw = getNestedValue(b, field);
            const valA = aRaw instanceof Date ? aRaw.getTime() : aRaw;
            const valB = bRaw instanceof Date ? bRaw.getTime() : bRaw;
            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
          }
          return 0;
        });
      }
    }

    return list;
  };

  return Model;
}

// Initialize on module import
loadFromDisk();

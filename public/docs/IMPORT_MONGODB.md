# Import from MongoDB

MongoDB has no universal FK metadata. This workflow **infers a logical schema** from:

- collection **names** → tables  
- **estimated document count** → `rowCount`  
- **sampling one document** → column names and simple types  

Run in **mongosh** connected to your database. Output is extended JSON you can paste into the app.

```javascript
const dbName = db.getName();
const sampleSize = 1;
function guessType(v) {
  if (v === null || v === undefined) return "null";
  const t = typeof v;
  if (t === "number") return Number.isInteger(v) ? "int" : "double";
  if (t === "boolean") return "bool";
  if (v instanceof Date) return "date";
  if (Array.isArray(v)) return "array";
  if (t === "object" && v._bsontype === "ObjectId") return "objectId";
  if (t === "object") return "object";
  return "string";
}

const tables = [];
for (const name of db.getCollectionNames()) {
  if (name.startsWith("system.")) continue;
  const coll = db.getCollection(name);
  const rowCount = coll.estimatedDocumentCount();
  const doc = coll.findOne() || {};
  const columns = [];
  let i = 0;
  for (const [k, v] of Object.entries(doc)) {
    columns.push({
      name: k,
      type: guessType(v),
      primaryKey: i++ === 0 && guessType(v) === "objectId",
      nullable: true,
    });
  }
  if (columns.length === 0) {
    columns.push({ name: "_placeholder", type: "unknown", nullable: true });
  }
  tables.push({ name, rowCount, columns });
}

printjson({ name: dbName, tables });
```

### Adding relationships

The visualizer only draws FK lines from `foreignKey` fields. After export, **hand-edit JSON** (or merge with a mapping file) to add:

```json
"foreignKey": { "table": "orders", "column": "_id" }
```

…where your application enforces references.

### Atlas

Use **mongosh** against your Atlas cluster URI, or run the script in **Compass** playground and copy the printed JSON.

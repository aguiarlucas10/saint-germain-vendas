// ══════════════════════════════════════
//  FIREBASE / STORAGE
// ══════════════════════════════════════
async function dbGetAll(col) {
  if (useFirebase) {
    const snap = await db.collection(col).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return LOCAL.get(col);
}
async function dbAdd(col, data) {
  if (useFirebase) {
    const ref = await db.collection(col).add({ ...data, _ts: Date.now() });
    return ref.id;
  }
  const arr = LOCAL.get(col);
  const id = 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
  arr.unshift({ id, ...data, _ts: Date.now() });
  LOCAL.set(col, arr);
  return id;
}
async function dbAddBatch(col, items) {
  if (useFirebase) {
    const chunks = [];
    for (let i=0; i<items.length; i+=400) chunks.push(items.slice(i,i+400));
    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(d => batch.set(db.collection(col).doc(), { ...d, _ts: Date.now() }));
      await batch.commit();
    }
  } else {
    const arr = LOCAL.get(col);
    items.forEach(d => arr.unshift({ id:'l_'+Date.now()+'_'+Math.random().toString(36).substr(2,4), ...d, _ts:Date.now() }));
    LOCAL.set(col, arr);
  }
}
async function dbUpdate(col, id, data) {
  if (useFirebase) {
    // Use set with merge so it creates the doc if it doesn't exist
    await db.collection(col).doc(id).set(data, { merge: true });
  } else {
    const arr = LOCAL.get(col);
    const i = arr.findIndex(x => x.id === id);
    if (i >= 0) { arr[i] = { ...arr[i], ...data }; LOCAL.set(col, arr); }
    else { LOCAL.set(col, [...arr, { id, ...data }]); }
  }
}
async function dbDelete(col, id) {
  if (useFirebase) { await db.collection(col).doc(id).delete(); }
  else { LOCAL.set(col, LOCAL.get(col).filter(x => x.id !== id)); }
}

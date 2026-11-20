'use strict';
// User IDs are opaque database primary keys. Never infer their format from a
// provisioning helper: migrated accounts may retain legacy IDs.
function isValidUserId(value){
 return typeof value==='string'&&value.length>=1&&value.length<=128&&
  !/[\\u0000-\\u001f\\u007f]/.test(value);
}
module.exports={isValidUserId};

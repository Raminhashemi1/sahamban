'use strict';
// User IDs are opaque database primary keys. Migrated accounts may retain legacy IDs.
function isValidUserId(value){
 return typeof value==='string'&&value.length>=1&&value.length<=128&&
  !/[\x00-\x1f\x7f]/.test(value);
}
module.exports={isValidUserId};

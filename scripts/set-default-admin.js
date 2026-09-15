const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  // Set isDefault: true for default admin 69cbebc1afbc23659cc20bd4
  const res = await mongoose.connection.collection('admins').updateOne(
    { _id: new mongoose.Types.ObjectId('69cbebc1afbc23659cc20bd4') },
    { $set: { isDefault: true, role: 'Super Admin' } }
  );
  console.log('Default admin updated:', res.modifiedCount);

  // Set isDefault: false for others
  await mongoose.connection.collection('admins').updateMany(
    { _id: { $ne: new mongoose.Types.ObjectId('69cbebc1afbc23659cc20bd4') } },
    { $set: { isDefault: false } }
  );

  const allAdmins = await mongoose.connection.collection('admins').find({}).toArray();
  console.log('All admins in DB now:', allAdmins.map(a => ({ id: a._id, name: a.name, email: a.email, isDefault: a.isDefault, role: a.role })));
  await mongoose.disconnect();
}

run().catch(console.error);


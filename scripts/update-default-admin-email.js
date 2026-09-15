const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-app');
  
  const res = await mongoose.connection.collection('admins').updateOne(
    { _id: new mongoose.Types.ObjectId('69cbebc1afbc23659cc20bd4') },
    { $set: { email: 'jkarumajji@gmail.com', isDefault: true, role: 'Super Admin' } }
  );
  console.log('Default admin email updated to jkarumajji@gmail.com:', res.modifiedCount);

  const updatedAdmin = await mongoose.connection.collection('admins').findOne({ _id: new mongoose.Types.ObjectId('69cbebc1afbc23659cc20bd4') });
  console.log('Updated default admin doc:', {
    _id: updatedAdmin._id,
    name: updatedAdmin.name,
    email: updatedAdmin.email,
    isDefault: updatedAdmin.isDefault,
    role: updatedAdmin.role
  });

  await mongoose.disconnect();
}

run().catch(console.error);


const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://techrootments_db_user:Brynex@cluster0.y82ex01.mongodb.net/rootfinn?appName=Cluster0";

mongoose.connect(MONGODB_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    
    const collection = db.collection('closes');
    
    // Let's find all pending_approval records
    const records = await collection.find({ status: "pending_approval" }).toArray();
    console.log("Found records:", records);

    // Delete them
    const result = await collection.deleteMany({ status: "pending_approval" });
    console.log(`Deleted ${result.deletedCount} pending approval documents.`);
    
    mongoose.disconnect();
  })
  .catch(console.error);

import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://techbrynex_db_user:Brynex@cluster0.y82ex01.mongodb.net/rootfinn?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const targets = await db.collection('expensetargets').find({}).toArray();
    console.log(JSON.stringify(targets, null, 2));
    process.exit(0);
  })
  .catch(console.error);

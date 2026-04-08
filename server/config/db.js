const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        // const conn = await mongoose.connect('mongodb://localhost:27017/expense-splitter');

        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://krishnadobariya3488_db_user:skXWf5i6UH28V2wE@cluster0.syhivxl.mongodb.net/?appName=Cluster0');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // process.exit(1);
    }
};

module.exports = connectDB;

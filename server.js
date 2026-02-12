const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(cors()); 
app.use(express.json());

// --- DATABASE CONNECTION ---
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://test_DB:nEb9rPtpnuF9FyGI@cluster0.dh5iah8.mongodb.net/CampusBookingDB";
mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

// --- SCHEMA & MODEL ---
const bookingSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    bookTitle: { type: String, required: true }, // ADDED: Required for your library logic
    roomNumber: { type: String, required: true },
    timeSlot: { type: Number, required: true }, // Number type ensures clean math for the timer
    status: { type: String, default: 'Confirmed' },
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now } 
});

const Booking = mongoose.model('Booking', bookingSchema, 'bookings');

// --- ROUTES ---

// 1. Health Check
app.get('/', (req, res) => {
    res.send('Campus Booking API is Running!');
});

// 2. READ: Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const data = await Booking.find();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: "Error fetching data" });
    }
});

// 3. CREATE: Add a new booking
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new Booking({
            studentName: req.body.studentName,
            bookTitle: req.body.bookTitle,   // ADDED: Captures the book from frontend
            roomNumber: req.body.roomNumber,
            timeSlot: req.body.timeSlot,
            status: req.body.status || 'Confirmed',
            isArchived: false,
            createdAt: req.body.createdAt || new Date() 
        });
        
        await newBooking.save();
        res.json({ message: "Success!", data: newBooking });
    } catch (err) {
        res.status(400).json({ message: "Error saving booking", error: err.message });
    }
});

// 4. UPDATE (ARCHIVE): Mark as finished
app.patch('/api/bookings/:id', async (req, res) => {
    try {
        const updatedBooking = await Booking.findByIdAndUpdate(
            req.params.id, 
            { isArchived: true, status: 'Completed' },
            { new: true }
        );
        res.json(updatedBooking);
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
});

// 5. DELETE: Permanent removal
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000; // Use Render's port or 3000 locally
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
use('CampusBookingDB');

db.getCollection('bookings').insertOne({
  studentName: "Nathaniel Salao",
  bookTitle: "Data Structures and Algorithms", 
  roomNumber: "Lab 302",
  timeSlot: "2", 
  status: "Confirmed",
  isArchived: false, 
  createdAt: new Date() 
});

db.getCollection('bookings').find({});
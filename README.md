Barbershop App
==============

Introduction
------------

The Barbershop app is a robust and user-friendly platform designed to streamline the operations of a barbershop. It offers a comprehensive suite of features to manage bookings, barber schedules, services, and more.

Key Features
------------

### Bookings Management

-   Create Bookings: Customers can book appointments with their preferred barber, specifying the services they require.
-   View Bookings: Retrieve all bookings, providing a comprehensive overview of upcoming appointments.
-   Manage Time Slots: Check unavailable time slots for specific barbers, ensuring efficient scheduling.
-   Delete Bookings: Admins can delete bookings as needed.

### Services Management

-   List Services: Display all available services, including details like price and duration.
-   Add Services: Admins can add new services to the system, specifying details such as service name, price, and duration.
-   Update Services: Modify existing services to reflect changes in offerings or prices.
-   Delete Services: Remove services that are no longer offered.

### Barber Availability

-   Manage Barber Schedules: Admins can update barber availability, ensuring accurate scheduling and booking.

### Gallery Management

-   Image Uploads: Admins can upload images to the gallery, showcasing the barbershop's environment and services.

### Admin Management

-   Secure Admin Routes: Admin-specific routes for managing the application, protected by authentication.

Technologies Used
-----------------

-   Node.js: For building the backend server.
-   Express.js: A web application framework for Node.js.
-   MySQL: As a database to store all the data.
-   Nodemailer: For sending email confirmations.
-   Multer: For handling image uploads.
-   bcrypt: For hashing passwords.
-   jsonwebtoken: For generating JWTs for secure authentication.
-   dotenv: To manage environment variables.
-   body-parser: To parse incoming request bodies.
-   cors: To enable CORS.

Installation and Setup
----------------------

1.  Clone the Repository:

    bashCopy code

    `git clone https://github.com/ZenKhalil/ExamProject-Barbershop-app-`

2.  Install Dependencies: Navigate to the cloned directory and run:

    Copy code

    `npm install`

3.  Environment Variables: Create a `.env` file in the root directory and set the following variables:

    -   `PORT`: The port number for the server.
    -   `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`: Database connection details.
    -   `EMAIL_SERVICE`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`: For Nodemailer configuration.
    -   `JWT_SECRET`: Secret key for JWT.
    -   `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`: Admin credentials.
4.  Start the Server:

    sqlCopy code

    `npm start`

5.  Accessing the App: The app will be running at `http://localhost:[PORT]` where `[PORT]` is the port number you set in the `.env` file.

## Access to deployed website
https://examproject-testdata-3.azurewebsites.net/

### Detailed Routes Overview

#### 1\. Admin Routes (`routes/admin.js`)

-   Admin Login: Secure endpoint for admin login. It uses JWT for authentication, ensuring that only authorized users can access admin functionalities.

#### 2\. Barber Availability Routes (`routes/barber_availability.js`)

-   Mark Barber Unavailable: Allows the admin to mark certain dates as unavailable for a specific barber, ensuring the booking system reflects their availability accurately.
-   Retrieve Unavailable Dates: Fetch all dates when a specific barber is unavailable.
-   Update Unavailability: Modify the unavailable dates for a barber, offering flexibility in managing schedules.
-   Delete Unavailability: Remove unavailability entries, allowing for dynamic schedule adjustments.

#### 3\. Barbers Routes (`routes/barbers.js`)

-   List Barbers: Retrieve details of all barbers, including their names, contact information, and availability.
-   Add Barber: Admins can add new barbers to the system.
-   Update Barber Details: Modify information about existing barbers.
-   Delete Barber: Remove a barber from the system.

#### 4\. Bookings Routes (`routes/bookings.js`)

-   Retrieve Unavailable Time Slots: Check which time slots are not available for a specific barber on a given date.
-   Create Booking: Customers can book appointments, selecting their preferred barber and services.
-   View All Bookings: Get an overview of all bookings made.
-   Delete Booking: Admins can delete bookings as necessary.

#### 5\. Gallery Routes (`routes/gallery.js`)

-   Retrieve Images: Fetch all images from the gallery, showcasing the barbershop's environment and work.
-   Upload Image: Admins can upload new images to the gallery.
-   Delete Image: Remove images from the gallery.

#### 6\. Services Routes (`routes/services.js`)

-   List Services: Display all services offered by the barbershop, including details like price and duration.
-   Add Service: Admins can add new services to the system.
-   Update Service: Modify details of existing services.
-   Delete Service: Remove services that are no longer available.

### Conclusion

Each route in your application is carefully designed to handle specific aspects of the barbershop's operations, from managing bookings and barber schedules to handling the services offered and the gallery. This modular approach makes the application flexible and easy to maintain or expand in the future.

# Contributing
------------

Contributions are welcome. Please fork the repository, make your changes, and submit a pull request.

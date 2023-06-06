const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const facultyControllers = require('../controllers/facultycontrollers');

router.get('/login', facultyControllers.showLoginPage);

router.post('/login', facultyControllers.facultyLogin);
router.get('/logout', facultyControllers.facultyLogout);
router.use(function (req, res, next) {
  jwt.verify(req.cookies.facultyToken, jwtPrivateKey, function (err, decoded) {
    if (err) {
      console.log('ERROR');
      res.redirect('./login');
    } else {
      globaltype = decoded.type;
      globalFirstname = decoded.firstname;
      globalLastname = decoded.lastname;
      globalFacultyID = decoded.faculty_id;
      globalDepartmentID = decoded.department_id;
      next();
    }
  });
});
router.get('/dashboard', facultyControllers.showDashboard);
router.get('/attendance', facultyControllers.showAttendancePage);

router.get('/uploadattendance', facultyControllers.showUploadAttendancePage);
//
router.post('/uploadattendance', facultyControllers.uploadAttendance);
//
router.get('/requestcourse', facultyControllers.showRequestCoursePage);
router.get('/requestnewcourse', facultyControllers.showRequestNewCoursePage);
router.get('/timetable', facultyControllers.showTimetablePage);
router.get('/cancelrequestnewcourse', facultyControllers.cancelRequestCourse);
router.get('/offeredcourses', facultyControllers.offeredCoruses);
router.get('/requestroom', facultyControllers.requestRoom);
router.get('/viewroomrequests', facultyControllers.viewRequestRooms);

router.get('/deleterequestroom', facultyControllers.deleteRoomRequest);
router.get('/uploadmarks', facultyControllers.getMarksDetail);
router.get('/createscheme', facultyControllers.createMarkingScheme);
router.get('/viewmarks', facultyControllers.viewMarks);
router.get('/editmarks', facultyControllers.editMarks);
router.post('/editmarks', facultyControllers.saveEditedMarks);

router.post('/lockmarks', facultyControllers.lockGrade);
module.exports = router;

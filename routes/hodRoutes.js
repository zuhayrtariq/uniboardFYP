const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const hodControllers = require('../controllers/hodcontrollers');

router.get('/login', hodControllers.showLoginPage);

router.post('/login', hodControllers.hodLogin);
router.get('/logout', hodControllers.hodLogout);

router.use(function (req, res, next) {
  jwt.verify(req.cookies.hodToken, jwtPrivateKey, function (err, decoded) {
    if (err) {
      console.log('ERROR');
      res.redirect('./login');
    } else {
      globalHODType = decoded.type;
      globalFirstname = decoded.firstname;
      globalLastname = decoded.lastname;
      globalFacultyID = decoded.faculty_id;
      globalDepartmentID = decoded.department_id;
      next();
    }
  });
});

router.get('/dashboard', hodControllers.showDashboard);
router.get('/offeredcourses', hodControllers.showOfferedCourses);
router.get('/inprogresscourses', hodControllers.showInProgressCourses);
router.get('/departmentcourses', hodControllers.showAllDepartmentCourses);

router.get('/offernewcourse', hodControllers.showOfferNewCourse);
router.post('/offernewcourse', hodControllers.offerNewCourse);
router.get('/allotfaculty', hodControllers.showAllotFaculty);
router.post('/allotfaculty', hodControllers.allotFaculty);
router.get('/deleteofferedcourse', hodControllers.showDeleteCourses);

router.post('/deleteofferedcourse', hodControllers.deleteOfferedCourse);
router.get('/facultycoursereq', hodControllers.showFacultyCourseRequest);
router.post('/acceptfacultyreq', hodControllers.acceptFacultyRequest);
router.post('/rejectfacultyreq', hodControllers.rejectFacultyRequest);
router.get('/lockgrades', hodControllers.getSectionsToLock);
router.post('/lockgrades', hodControllers.lockGrade);
router.get('/viewmarks', hodControllers.viewMarks);
module.exports = router;

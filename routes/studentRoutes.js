const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const studentControllers = require('../controllers/studentcontrollers');

router.get('/login', studentControllers.showLoginPage);

router.post('/login', studentControllers.studentLogin);
router.get('/logout', studentControllers.studentLogout);
router.use(function (req, res, next) {
  jwt.verify(req.cookies.studentToken, jwtPrivateKey, function (err, decoded) {
    if (err) {
      console.log('ERROR');
      res.redirect('./login');
    } else {
      globalProgramID = decoded.program_id;
      globalFirstname = decoded.firstname;
      globalLastname = decoded.lastname;
      globalStudentId = decoded.student_id;
      next();
    }
  });
});
router.get('/dashboard', studentControllers.showDashboard);
router.get('/attendance', studentControllers.showAttendancePage);
router.get('/timetable', studentControllers.showTimetablePage);
router.get('/addcourse', studentControllers.showAddCoursePage);
router.get('/dropcourse', studentControllers.showDropCoursePage);
router.get('/viewmarks', studentControllers.showViewMarksPage);
router.get('/fees', studentControllers.showFees);
router.get('/roadmap', studentControllers.showRoadMap);
router.get('/coursecatalog', studentControllers.showCourseCatalog);
router.get('/studentprofile', studentControllers.showStudentProfile);
router.post('/registercourse', studentControllers.studentRegisterCourse);
router.post('/unregistercourse', studentControllers.studentUnRegisterCourse);
router.post('/dropcourse', studentControllers.studentDropCourse);
router.post('/addbalance', studentControllers.studentAddBalance);
router.get('/addAmountinAccount', studentControllers.AddAmountInAccount);

module.exports = router;

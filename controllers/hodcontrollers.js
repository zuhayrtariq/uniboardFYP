const hodModels = require('../models/hoddb');
const facultyModels = require('../models/facultydb');
const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');
const cryptr = new Cryptr('myTotallySecretKey');
const moment = require('moment');

const showLoginPage = async (req, res) => {
  console.log('HOD Login Route!!!');
  res.render('HODLogin', { title: 'HOD Log in' });
};
const hodLogin = async (req, res) => {
  const { username, password } = req.body;

  async function getResult(username, password) {
    const result = await hodModels.hodLogIn(username, password);

    if (!result.length) {
      res.render('HODLogin', {
        title: 'HOD Log in',
        error: 'Incorrect Username or Password',
      });
    } else {
      const hodDetails = await hodModels.getHodDetails(username);
      console.log(hodDetails);
      res.cookie(
        'hodToken',
        jwt.sign(
          {
            firstname: hodDetails.faculty_firstname,
            lastname: hodDetails.faculty_lastname,
            faculty_id: hodDetails.faculty_id,
            type: hodDetails.faculty_type,
            department_id: hodDetails.department_id,
          },
          jwtPrivateKey
        ),
        { httpOnly: true }
      );
      res.redirect('./dashboard');
    }
  }
  getResult(username, password);
};
const hodLogout = async (req, res) => {
  console.log('HOD Logout Route!!!');
  res.clearCookie('HODToken');
  res.redirect('./login');
};

const showDashboard = async (req, res) => {
  console.log('HOD Dashboard Route!!!');
  res.render('HodDashboard', {
    page_name: 'dashboard',
    title: 'HOD Dashboard',
    firstname: globalFirstname,
    lastname: globalLastname,
  });
};
const showOfferedCourses = async (req, res) => {
  console.log('HOD Offered Courses Route');
  const AllOfferedCourses = await hodModels.getSectionDetails(
    globalDepartmentID,
    'Active'
  );
  res.render('HodViewcourses', {
    page_name: 'offeredcourses',
    firstname: globalFirstname,
    lastname: globalLastname,
    AllOfferedCourses,
  });
};
const showInProgressCourses = async (req, res) => {
  console.log('HOD In Progress Courses Route');
  const inProgressSections = await hodModels.getSectionDetails(
    globalDepartmentID,
    'In Progress'
  );
  res.render('HodViewcourses', {
    page_name: 'inprogresscourses',
    firstname: globalFirstname,
    lastname: globalLastname,
    AllOfferedCourses: inProgressSections,
  });
};
const showAllDepartmentCourses = async (req, res) => {
  console.log('HOD Department Courses Route');
  const AllDepartmentCourses = await hodModels.getAllDepartmentCourses(
    globalDepartmentID,
    'In Progress'
  );

  res.render('HodDepartmentCourses', {
    page_name: 'departmentcourses',
    firstname: globalFirstname,
    lastname: globalLastname,
    AllDepartmentCourses,
  });
};

const showOfferNewCourse = async (req, res) => {
  console.log('Req Query', req.query);
  const { courseCode, timeSlot, facultyID, mes } = req.query;

  console.log('HOD Offer Course Route');

  let freeFaculty = [],
    allFacultyIDs;
  allFacultyIDs = await hodModels.getAllDepartmentFacultyIDs(
    globalDepartmentID
  );
  if (timeSlot) {
    for (let i = 0; i < allFacultyIDs.length; i++) {
      let available = await hodModels.checkFacultyAvailability(
        allFacultyIDs[i],
        timeSlot,
        'Active'
      );
      if (available) {
        freeFaculty.push(allFacultyIDs[i]);
      }
    }
    console.log(freeFaculty);
    // bookedFaculty = await hodModels.getFacultyBookedSlots(timeSlot);
  }
  let courseCodes = await hodModels.getAllDepartmentCourses(globalDepartmentID);
  courseCodes = courseCodes.map((x) => {
    return x.course_code;
  });

  let timeSlots = await hodModels.getAllTimeSlots();
  // timeSlots = timeSlots.map((x) => {
  //   return x.course_code;
  // });
  let facultyDetails = [];
  for (let i = 0; i < freeFaculty.length; i++) {
    let details = await hodModels.getFacultyDetails(
      globalDepartmentID,
      freeFaculty[i]
    );
    facultyDetails.push(details[0]);
  }
  console.log(facultyDetails);
  let selectedSlot;
  if (timeSlot) {
    selectedSlot = await hodModels.getSlotDetails(timeSlot);
    selectedSlot = selectedSlot[0];
  }
  let selectedFaculty;
  if (facultyID) {
    selectedFaculty = await hodModels.getFacultyDetails(
      globalDepartmentID,
      facultyID
    );
    selectedFaculty = selectedFaculty[0];
  }
  res.render('HodOfferCourse', {
    page_name: 'offernewcourse',
    firstname: globalFirstname,
    lastname: globalLastname,
    courseCodes,
    timeSlots,
    facultyDetails,

    selectedCourse: courseCode,
    selectedSlot,
    selectedFaculty,
    mes,
  });
};

const offerNewCourse = async (req, res) => {
  const { courseCode, timeSlot, facultyID } = req.body;

  let activeSem = await hodModels.getSemesterID('Active');

  let sectionCode = await hodModels.getNewSectionCode();
  console.log(sectionCode);
  await hodModels.offerNewSection(
    sectionCode,
    activeSem,
    courseCode,
    facultyID,
    timeSlot
  );

  res.redirect(`./offernewcourse?mes=${sectionCode}`);
};

const showAllotFaculty = async (req, res) => {
  console.log('HOD Allot Faculty Route');
  const { sectionCode, timeSlot, facultyID, secCodePOST, facIDPOST } =
    req.query;

  //UPDATE section_details SET faculty_id = '1000' WHERE section_details.section_code = 'M-1000';

  let bookedFaculty = [],
    facultyDetails = [],
    selectedFaculty;
  const sections = await hodModels.sectionsWithoutFaculty(globalDepartmentID);
  if (sectionCode) {
    let freeFaculty = [],
      allFacultyIDs;
    allFacultyIDs = await hodModels.getAllDepartmentFacultyIDs(
      globalDepartmentID
    );
    for (let i = 0; i < allFacultyIDs.length; i++) {
      let available = await hodModels.checkFacultyAvailability(
        allFacultyIDs[i],
        timeSlot,
        'Active'
      );
      if (available) {
        freeFaculty.push(allFacultyIDs[i]);
      }
    }
    for (let i = 0; i < freeFaculty.length; i++) {
      let details = await hodModels.getFacultyDetails(
        globalDepartmentID,
        freeFaculty[i]
      );
      facultyDetails.push(details[0]);
    }
  }
  if (facultyID) {
    selectedFaculty = await hodModels.getFacultyDetails(
      globalDepartmentID,
      facultyID
    );
    selectedFaculty = selectedFaculty[0];
  }
  res.render('HodAllotFaculty', {
    page_name: 'allotfaculty',
    firstname: globalFirstname,
    lastname: globalLastname,
    sections,
    selectedSection: sectionCode,
    facultyDetails,
    timeSlot,
    selectedFaculty,
    secCodePOST,
    facIDPOST,
  });
};
const allotFaculty = async (req, res) => {
  const { sectionCode, facultyID } = req.body;
  console.log('HOD Allot Course Section and ID : ', sectionCode, facultyID);

  //UPDATE section_details SET faculty_id = '1000' WHERE section_details.section_code = 'M-1000';

  await hodModels.allotFaculty(facultyID, sectionCode);

  res.redirect(
    `./allotfaculty?secCodePOST=${sectionCode}&facIDPOST=${facultyID}`
  );
};
const showDeleteCourses = async (req, res) => {
  console.log('HOD Delete Offered Course Route');
  const { mes } = req.query;

  //UPDATE section_details SET faculty_id = '1000' WHERE section_details.section_code = 'M-1000';

  let courses = await hodModels.getSectionDetails(globalDepartmentID, 'Active');

  res.render('HodDeleteCourse', {
    page_name: 'deleteofferedcourse',
    firstname: globalFirstname,
    lastname: globalLastname,
    courses,
    mes,
  });
};

const deleteOfferedCourse = async (req, res) => {
  const { sectionCode } = req.body;
  console.log('HOD Delete Offered Course Route Section: ', sectionCode);

  await hodModels.deleteOfferedSection(sectionCode);

  res.redirect(`./deleteofferedcourse?mes=${sectionCode}`);
};
const showFacultyCourseRequest = async (req, res) => {
  console.log('HOD Faculty Course Requests Route');
  const { sectionCode, facultyID } = req.query;

  const facultyRequests = await hodModels.getFacultySectionRequests(
    globalDepartmentID
  );
  console.log(facultyRequests);
  res.render('HodViewFacultyRequest', {
    page_name: 'facultycoursereq',
    firstname: globalFirstname,
    lastname: globalLastname,
    facultyRequests,
    sectionCode,
    facultyID,
  });
};

const acceptFacultyRequest = async (req, res) => {
  console.log('HOD Accept Faculty Course Requests Route');
  console.log(req.body);
  const { sectionCode, facultyID } = req.body;
  await hodModels.allotFaculty(facultyID, sectionCode);
  await hodModels.deleteSectionRequest(sectionCode, facultyID);
  res.redirect(
    `./facultycoursereq?sectionCode=${sectionCode}&facultyID=${facultyID}`
  );
};
const rejectFacultyRequest = async (req, res) => {
  console.log('HOD Reject Faculty Course Requests Route');

  const { sectionCode, facultyID } = req.body;
  await hodModels.deleteSectionRequest(sectionCode, facultyID);

  res.redirect(`./facultycoursereq`);
};

const getSectionsToLock = async (req, res) => {
  console.log('faculty UploadMarks Route!!!');
  let inProgSecData = await hodModels.getSectionDetails(
    globalDepartmentID,
    'In Progress'
  );
  inProgSecData = inProgSecData.filter((x) => {
    if (x.faculty_lock) {
      return x;
    }
  });
  console.log(inProgSecData);

  res.render('hodLockGrades', {
    page_name: 'lockgrade',
    firstname: globalFirstname,
    lastname: globalLastname,
    inProgSecData,
  });
};

const viewMarks = async (req, res) => {
  let { sectionCode } = req.query;
  console.log(
    'View Marks Request For Locking Grade Section Code : ',
    sectionCode
  );
  let { marksType, totalMarks } = await facultyModels.getMarksType(sectionCode);
  console.log(marksType, totalMarks);
  let allSectionData = await facultyModels.getSectionMarks(sectionCode);

  let tmarks, grade, gpa;
  for (let i = 0; i < allSectionData.length; i++) {
    tmarks = 0;
    for (let j = 0; j < marksType.length; j++) {
      console.log('Marks Type : ', marksType[j]);
      tmarks = tmarks + Math.round(parseFloat(allSectionData[i][marksType[j]]));
    }

    allSectionData[i].totalmarks = tmarks;
    grade = await facultyModels.getGrade(tmarks);
    gpa = await facultyModels.getGPA(grade);
    allSectionData[i].grade = grade;
    allSectionData[i].gpa = gpa;
  }

  console.log(allSectionData);
  res.render('hodViewMarks', {
    page_name: 'viewmarks',
    firstname: globalFirstname,
    lastname: globalLastname,
    marksType,
    totalMarks,
    sectionCode,
    allSectionData,
  });
};
const lockGrade = async (req, res) => {
  const { sectionCode, status } = req.body;

  console.log('Faculty Lock Grade');
  if (status == '1') {
    await hodModels.hodGradeLock(sectionCode);
  } else if (status == '2') {
    await hodModels.hodGradeUnlock(sectionCode);
  }
  res.redirect('./lockgrades');
};

module.exports = {
  lockGrade,
  acceptFacultyRequest,
  showLoginPage,
  allotFaculty,
  rejectFacultyRequest,
  showFacultyCourseRequest,
  showDeleteCourses,
  deleteOfferedCourse,
  hodLogin,
  hodLogout,
  showDashboard,
  showOfferedCourses,
  showInProgressCourses,
  showAllDepartmentCourses,
  offerNewCourse,
  showOfferNewCourse,
  showAllotFaculty,
  viewMarks,
  getSectionsToLock,
};

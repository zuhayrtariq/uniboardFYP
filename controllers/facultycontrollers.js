const facultyModels = require('../models/facultydb');
const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');
const cryptr = new Cryptr('myTotallySecretKey');
const moment = require('moment');
const showLoginPage = async (req, res) => {
  console.log('Faculty Login Route!!!');
  res.render('facultyLogin', { title: 'Faculty Log in' });
};
const facultyLogin = async (req, res) => {
  const { username, password } = req.body;

  async function getResult(username, password) {
    const result = await facultyModels.facultyLogIn(username, password);

    if (!result.length) {
      res.render('facultyLogin', {
        title: 'Faculty Log in',
        error: 'Incorrect Username or Password',
      });
    } else {
      const facultyDetails = await facultyModels.getFacultyDetails(username);
      console.log(facultyDetails);
      res.cookie(
        'facultyToken',
        jwt.sign(
          {
            firstname: facultyDetails.faculty_firstname,
            lastname: facultyDetails.faculty_lastname,
            department_id: facultyDetails.department_id,
            faculty_id: facultyDetails.faculty_id,
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
const facultyLogout = async (req, res) => {
  console.log('Faculty Logout Route!!!');
  res.clearCookie('facultyToken');
  res.redirect('./login');
};

const showDashboard = async (req, res) => {
  console.log('Faculty Dashboard Route!!!');

  res.render('facultydashboard', {
    page_name: 'dashboard',
    firstname: globalFirstname,
    lastname: globalLastname,
  });
};

const showAttendancePage = async (req, res) => {
  console.log('faculty attendance Route!!!');

  let inProgSec = await facultyModels.getFacultySectionCodes(
    globalFacultyID,
    'In Progress'
  );
  console.log(inProgSec);

  let sectionDetails = [];
  for (let i = 0; i < inProgSec.length; i++) {
    sectionDetails.push(await facultyModels.getSectionDetails(inProgSec[i]));
    sectionDetails[i].semester_name = await facultyModels.getSemesterName(
      sectionDetails[i].semester_id
    );
  }
  console.log(sectionDetails);
  res.render('facultyAttendance', {
    page_name: 'attendance',
    firstname: globalFirstname,
    lastname: globalLastname,
    inProgSecData: sectionDetails,
  });
};

const showUploadAttendancePage = async (req, res) => {
  console.log('faculty Upload Attendance Route!!!');
  let attendanceDetails = [];
  const { sectionCode, selectedDate } = req.query;

  const sectionDetails = await facultyModels.getSectionDetails(sectionCode);
  let slotID = sectionDetails.slot_id;
  let slotDetails = await facultyModels.getSlotDetails(slotID);

  let slotDay = slotDetails.slot_day;

  slotDay = moment().day(slotDay).format('d');
  semesterID = sectionDetails.semester_id;

  const semesterDetails = await facultyModels.getSemesterDetails(semesterID);
  let semesterStartDate = semesterDetails.start_date;
  let semesterEndDate = semesterDetails.end_date;

  let start = moment(semesterStartDate),
    end = moment(semesterEndDate),
    datesArray = [];

  // Get "next" monday
  let tmp = start.clone().day(parseInt(slotDay));
  if (tmp.isSameOrAfter(start, 'd')) {
    datesArray.push(tmp.format('YYYY-MM-DD'));
  }
  while (tmp.isBefore(end)) {
    tmp.add(7, 'days');
    datesArray.push(tmp.format('YYYY-MM-DD'));
  }
  // res.render('facultyAttendance', {
  //   page_name: 'attendance',
  //   firstname: globalFirstname,
  //   lastname: globalLastname,
  //   inProgSecData,
  // });

  if (selectedDate) {
    attendanceDetails = await facultyModels.getAttendanceData(
      sectionCode,
      selectedDate
    );
    if (attendanceDetails.length) {
      for (let i = 0; i < attendanceDetails.length; i++) {
        let studentDetails = await facultyModels.getStudentDetails(
          attendanceDetails[i].student_id
        );
        attendanceDetails[i].student_firstname =
          studentDetails.student_firstname;
        attendanceDetails[i].student_lastname = studentDetails.student_lastname;
      }
    }

    //new attendance
    else {
      attendanceDetails = await facultyModels.getStudentIDinSection(
        sectionCode
      );
      for (let i = 0; i < attendanceDetails.length; i++) {
        let studentDetails = await facultyModels.getStudentDetails(
          attendanceDetails[i].student_id
        );

        attendanceDetails[i].student_firstname =
          studentDetails.student_firstname;
        attendanceDetails[i].student_lastname = studentDetails.student_lastname;
      }
    }

    for (let x of attendanceDetails) {
      x.totalAbsents = await facultyModels.getTotalStudentAbsents(
        x.student_id,
        sectionCode
      );
    }
  }
  res.render('facultyUploadAttendance', {
    page_name: 'attendance',
    firstname: globalFirstname,
    lastname: globalLastname,
    datesArray,
    slotDay: slotDetails.slot_day,
    slotTime: slotDetails.slot_time,
    sectionCode,
    selectedDate,
    attendanceDetails,
  });
};

const uploadAttendance = async (req, res) => {
  console.log('faculty POST Upload Attendance Route!!!');
  let { attendanceStatus, selectedDate, sectionCode } = req.body;
  if (!attendanceStatus) {
    attendanceStatus = [];
  }

  let studentsInSection = await facultyModels.getStudentIDinSection(
    sectionCode
  );

  const checkAttendExsist = await facultyModels.getAttendanceData(
    sectionCode,
    selectedDate
  );
  if (!checkAttendExsist.length) {
    for (let x of studentsInSection) {
      let status;
      if (attendanceStatus.includes(x.student_id)) {
        status = 'Present';
      } else {
        status = 'Absent';
      }
      await facultyModels.uploadAttendance(
        x.student_id,
        sectionCode,
        selectedDate,
        status
      );
    }
  } else {
    for (let x of studentsInSection) {
      let status;
      console.log(typeof x.student_id);
      if (attendanceStatus.includes(x.student_id)) {
        status = 'Present';
      } else {
        status = 'Absent';
      }
      await facultyModels.updateAttendance(
        x.student_id,
        sectionCode,
        selectedDate,
        status
      );
    }
  }

  // if (inProgSecData.length) {
  //   inProgSec = inProgSecData.map((x) => {
  //     return x.section_code;
  //   });
  // }
  // console.log(inProgSec);
  res.redirect(
    `./uploadattendance?sectionCode=${sectionCode}&selectedDate=${selectedDate}`
  );
};

const showTimetablePage = async (req, res) => {
  console.log('Faculty TimeTable Route!!!');

  let slotTime = await facultyModels.getAllTimeSlots();
  let slotDays = await facultyModels.getAllDays();
  let inProgSections = await facultyModels.getFacultySectionCodes(
    globalFacultyID,
    'In Progress'
  );

  for (let i = 0; i < inProgSections.length; i++) {
    inProgSections[i] = await facultyModels.getSectionDetails(
      inProgSections[i]
    );
    const { slot_day, slot_time } = await facultyModels.getSlotDetails(
      inProgSections[i].slot_id
    );
    inProgSections[i].slot_day = slot_day;
    inProgSections[i].slot_time = slot_time;
  }

  if (inProgSections.length) {
    inProgSections = inProgSections.map((x) => {
      return {
        course_code: x.course_code,
        course_title: x.course_title,
        slot_day: x.slot_day,
        slot_time: x.slot_time,
      };
    });
  }

  res.render('facultyTimeTable', {
    page_name: 'timetable',
    firstname: globalFirstname,
    lastname: globalLastname,
    slotDays,
    slotTime,
    inProgSections,
  });
};
const showRequestCoursePage = async (req, res) => {
  console.log('Faculty RequestCourse Route!!!');

  const activeSections = await facultyModels.getFacultySectionCodes(
    globalFacultyID,
    'Active'
  );

  for (let i = 0; i < activeSections.length; i++) {
    activeSections[i] = await facultyModels.getSectionDetails(
      activeSections[i]
    );
  }
  const bookedTimeSlots = activeSections.map((x) => {
    return x.slot_id;
  });

  const requestedSections = await facultyModels.facultyCourseRequests(
    globalFacultyID
  );

  if (requestedSections.length === 0) {
    requestedSections[0] = 'x142';
  }
  if (bookedTimeSlots.length === 0) {
    bookedTimeSlots[0] = 'x142';
  }
  const availableCourses = await facultyModels.getAvailableCourses(
    globalDepartmentID,
    bookedTimeSlots,
    requestedSections,
    1
  );

  const alreadyRequestedCourses = await facultyModels.getAvailableCourses(
    globalDepartmentID,
    bookedTimeSlots,
    requestedSections,
    2
  );

  res.render('facultyRequestCourse', {
    page_name: 'requestcourse',
    title: 'Faculty Portal',
    firstname: globalFirstname,
    lastname: globalLastname,
    availableCourses,
    alreadyRequestedCourses,
  });
};

const showRequestNewCoursePage = async (req, res) => {
  const sectionCode = req.query.sectioncode;
  console.log('Request new course for : ', sectionCode);
  try {
    await facultyModels.requestNewCourse(sectionCode, globalFacultyID);
  } catch (error) {
    console.log('Error in Request New Course Route', error);
  }
  res.redirect('./requestcourse');
};

const cancelRequestCourse = async (req, res) => {
  const sectionCode = req.query.sectioncode;
  console.log('Delete Course Request for : ', sectionCode);
  try {
    await facultyModels.cancelRequestNewCourse(sectionCode, globalFacultyID);
  } catch (error) {
    console.log('Error in Cancelling Request New Course Route', error);
  }
  res.redirect('./requestcourse');
};

const offeredCoruses = async (req, res) => {
  console.log('Faculty OfferedCourse Route!!!');

  let ActiveSections = await facultyModels.facultyOfferedCourses(
    globalFacultyID
  );
  console.log(ActiveSections);
  // if (ActiveSections.length) {
  //   ActiveSections = ActiveSections.map((x) => {
  //     return {
  //       course_code: x.course_code,
  //       course_title: x.course_title,
  //       slot_day: x.slot_day,
  //       slot_time: x.slot_time,
  //     };
  //   });
  // }

  res.render('facultyOfferedCourses', {
    page_name: 'offeredcourses',
    firstname: globalFirstname,
    lastname: globalLastname,

    courses: ActiveSections,
  });
};
const requestRoom = async (req, res) => {
  console.log('faculty requestroom Route!!!');
  let { sectionCode, building, floors, rooms, submitted, mes, sectionCode2 } =
    req.query;
  console.log(req.query);

  let activeSections = await facultyModels.sectionsWithoutRoomRequest(
    globalFacultyID
  );
  //If Clicked on a room
  if (sectionCode) {
    let labReq = await facultyModels.checkLabReq(sectionCode);

    let Allrooms;
    if (labReq) {
      Allrooms = await facultyModels.getAllRooms(1);
    } else {
      Allrooms = await facultyModels.getAllRooms(2);
    }
    //
    const tempAllBuildings = Allrooms.map((x) => {
      return x.building_name;
    });
    const allBuildings = [...new Set(tempAllBuildings)];

    //If Building is selected
    if (building) {
      let Allfloors = [];
      const maxFloor = await facultyModels.getMaxFloor(building);
      for (let i = 0; i < maxFloor; i++) {
        Allfloors[i] = i + 1;
      }

      //floor is also selected
      if (floors) {
        let Allrooms;
        let slotId = await facultyModels.getSectionDetails(sectionCode);
        slotId = slotId.slot_id;

        floors = floors.map(Number);

        let bookedRooms = await facultyModels.getBookedRooms(slotId);

        console.log(bookedRooms);
        if (!bookedRooms.length) {
          bookedRooms[0] = 'x142';
        }

        Allrooms = await facultyModels.getFreeRooms(
          bookedRooms,
          building,
          floors
        );
        console.log('ALL ROOMS : ', Allrooms);

        //room is also selected
        if (rooms) {
          //submitted
          if (submitted) {
            await facultyModels.addNewRoomRequest(sectionCode, rooms);
            res.redirect(
              `./requestroom?mes=success&sectionCode2=${sectionCode}`
            );
          } else {
            res.render('facultyRequestRoom', {
              page_name: 'requestroom',
              firstname: globalFirstname,
              lastname: globalLastname,
              courses: activeSections,
              allBuildings,
              building,
              Allfloors,
              sectionCode,
              floors,
              Allrooms,
              rooms,
            });
          }
        }
        //room is not selected
        else {
          res.render('facultyRequestRoom', {
            page_name: 'requestroom',
            firstname: globalFirstname,
            lastname: globalLastname,
            courses: activeSections,
            allBuildings,
            building,
            Allfloors,
            sectionCode,
            floors,
            Allrooms,
          });
        }
      }
      //floor not selected
      else {
        res.render('facultyRequestRoom', {
          page_name: 'requestroom',
          firstname: globalFirstname,
          lastname: globalLastname,
          courses: activeSections,
          allBuildings,
          building,
          Allfloors,
          sectionCode,
        });
      }
    }
    //building not selected
    else {
      res.render('facultyRequestRoom', {
        page_name: 'requestroom',
        firstname: globalFirstname,
        lastname: globalLastname,
        courses: activeSections,
        allBuildings,
        sectionCode,
      });
    }
  }
  //no section selected
  else {
    res.render('facultyRequestRoom', {
      page_name: 'requestroom',
      firstname: globalFirstname,
      lastname: globalLastname,
      courses: activeSections,
      mes,
      sectionCode2,
    });
  }
};
const viewRequestRooms = async (req, res) => {
  console.log('faculty viewroomrequests Route!!!');
  const secCode = req.query.sectionCode;
  const { roomRequestData, sectionCodes } =
    await facultyModels.viewRoomRequests(globalFacultyID);
  res.render('facultyViewRoomRequests', {
    page_name: 'viewroomrequests',
    firstname: globalFirstname,
    lastname: globalLastname,
    sectionCodes,
    roomRequestData,
    secCode,
  });
};
const deleteRoomRequest = async (req, res) => {
  const sectionCode = req.query.sectionCode;
  console.log(sectionCode);
  await facultyModels.deleteRoomRequest(sectionCode);
  res.redirect(`./viewroomrequests?sectionCode=${sectionCode}`);
};
const getMarksDetail = async (req, res) => {
  console.log('faculty UploadMarks Route!!!');
  let inProgSecData = await facultyModels.getFacultySectionCodes(
    globalFacultyID,
    'In Progress'
  );

  for (let i = 0; i < inProgSecData.length; i++) {
    inProgSecData[i] = await facultyModels.getSectionDetails(inProgSecData[i]);
    let tableName = inProgSecData[i].section_code;
    tableName = tableName.replace('-', '');
    if (await facultyModels.checkTableExsists(tableName)) {
      inProgSecData[i].marksExsist = true;
    } else {
      inProgSecData[i].marksExsist = false;
    }
  }
  res.render('facultyUploadMarks', {
    page_name: 'uploadmarks',
    firstname: globalFirstname,
    lastname: globalLastname,
    inProgSecData,
  });
};

const createMarkingScheme = async (req, res) => {
  console.log('Faculty Create Marking Scheme Route');
  console.log(req.query);
  const sectionCode = req.query.sectionCode;
  let type = req.query.marksType;
  let totalMarks = req.query.totalMarks;
  let formValue = req.query.formButton;
  let marksToDelete = req.query.marksToDelete;
  let markingScheme = [];
  let error;
  let marksType = [
    'MidTerm',
    'Assignments',
    'Quiz',
    'ClassActivity',
    'Project',
    'Presentation',
  ];
  if (totalMarks) {
    totalMarks = totalMarks.map(Number);
  }

  if (!type) {
    markingScheme = [
      { name: 'Final', totalMarks: 40 },
      { name: 'MidTerm', totalMarks: 30 },
      { name: 'Quiz', totalMarks: 15 },
      { name: 'Assignments', totalMarks: 15 },
    ];
  } else {
    type.forEach((x, i) => {
      let element = {};
      element.name = x;
      element.totalMarks = totalMarks[i];

      markingScheme.push(element);
    });
  }

  if (marksToDelete) {
    markingScheme = markingScheme.filter(function (obj) {
      return obj.name !== marksToDelete;
    });
  }
  if (formValue === '1') {
    let total = 0;
    markingScheme.forEach((item) => {
      total += item.totalMarks;
    });
    const uniqueValues = new Set(markingScheme.map((v) => v.name));
    if (uniqueValues.size < markingScheme.length) {
      error = 'DUP_NAME';
    } else if (total != 100) {
      error = 'TOTAL_MARKS_E';
      console.log(total);
    }
    if (error) {
      res.render('facultyCreateMarkScheme', {
        page_name: 'viewroomrequests',
        firstname: globalFirstname,
        lastname: globalLastname,
        marksType,
        markingScheme,
        sectionCode,
        error,
      });
      return 0;
    }
  }
  if (formValue == '1' && !error) {
    console.log('SUBMIT');
    await facultyModels.createMarksTable(sectionCode, markingScheme);
    res.redirect('./uploadmarks');
    return;
  }
  res.render('facultyCreateMarkScheme', {
    page_name: 'viewroomrequests',
    firstname: globalFirstname,
    lastname: globalLastname,
    marksType,
    markingScheme,
    sectionCode,
    error,
  });
};

const viewMarks = async (req, res) => {
  let { sectionCode } = req.query;
  console.log('View Marks Request For Section Code : ', sectionCode);
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
  res.render('facultyViewMarks', {
    page_name: 'viewmarks',
    firstname: globalFirstname,
    lastname: globalLastname,
    marksType,
    totalMarks,
    sectionCode,
    allSectionData,
  });
};

const editMarks = async (req, res) => {
  let { sectionCode, mes } = req.query;
  console.log('Edit Marks Request For Section Code : ', sectionCode);
  let { marksType, totalMarks } = await facultyModels.getMarksType(sectionCode);
  let allSectionData = await facultyModels.getSectionMarks(sectionCode);

  let tmarks, grade, gpa;
  for (let i = 0; i < allSectionData.length; i++) {
    tmarks = 0;
    for (let j = 0; j < marksType.length; j++) {
      tmarks = tmarks + Math.round(parseFloat(allSectionData[i][marksType[j]]));
    }

    allSectionData[i].totalmarks = tmarks;
    grade = await facultyModels.getGrade(tmarks);
    gpa = await facultyModels.getGPA(grade);
    allSectionData[i].grade = grade;
    allSectionData[i].gpa = gpa;
  }
  const markingSchemeData = await facultyModels.getAllGradeData();
  res.render('facultyEditMarks', {
    page_name: 'editmarks',
    firstname: globalFirstname,
    lastname: globalLastname,
    marksType,
    totalMarks,
    sectionCode,
    allSectionData,
    markingSchemeData,
    mes,
  });
};
const lockGrade = async (req, res) => {
  const { sectionCode } = req.body;

  console.log('Faculty Lock Grade');
  await facultyModels.facultyGradeLock(sectionCode);
  res.redirect('./uploadmarks');
};
const saveEditedMarks = async (req, res) => {
  const { studentID, sectionCode } = req.body;
  console.log('This is Req.body', req.body);
  let marksLength = req.body.updatedMarks0;
  let updatedMarks = [];
  let temp;
  for (let i = 0; i < studentID.length; i++) {
    for (let j = 0; j < marksLength.length; j++) {
      temp = req.body[`updatedMarks${i}`][j];

      updatedMarks.push(temp);
    }
  }

  console.log('Edit Marks Request For Section Code : ', sectionCode);
  let { marksType } = await facultyModels.getMarksType(sectionCode);

  await facultyModels.updateSectionMarks(
    sectionCode,
    studentID,
    updatedMarks,
    marksType
  );
  res.redirect(`./editmarks?sectionCode=${sectionCode}&mes=1`);
};

module.exports = {
  viewMarks,
  editMarks,
  saveEditedMarks,

  createMarkingScheme,
  deleteRoomRequest,
  getMarksDetail,
  requestRoom,
  offeredCoruses,
  showLoginPage,
  facultyLogin,
  facultyLogout,
  showDashboard,
  showAttendancePage,
  showUploadAttendancePage,
  uploadAttendance,
  showRequestCoursePage,
  showRequestNewCoursePage,
  showTimetablePage,
  cancelRequestCourse,
  viewRequestRooms,
  lockGrade,
  //  showAddCoursePage,
  //  showDropCoursePage,
  //  showViewMarksPage,
  //  showFees,
  //  showRoadMap,
  //  showCourseCatalog,
  //  showfacultyProfile,
  //  facultyRegisterCourse,
  //  facultyUnRegisterCourse,
  //  facultyDropCourse,
};

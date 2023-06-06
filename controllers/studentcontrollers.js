const studentModels = require('../models/studentdb');
const jwt = require('jsonwebtoken');
const Cryptr = require('cryptr');
const cryptr = new Cryptr('myTotallySecretKey');
const STRIPE_PRIVATE_KEY = 'abc';
const stripe = require('stripe')(
  'sk_test_51LadFJJAYW0LamAcQF1m3UnYQ5CNwNmpZwrICS3IQ6Rjgau1R4JKtqhvovtdaLnkC6BKntQTZrDkWoeo6LyMvztM00zAobeJ4t'
);

const showLoginPage = async (req, res) => {
  console.log('Student Login Route!!!');
  res.render('studentLogin', { title: 'Student Log in' });
};
const studentLogin = async (req, res) => {
  const { username, password } = req.body;

  async function getResult(username, password) {
    const result = await studentModels.studentLogIn(username, password);

    if (!result.length) {
      res.render('studentLogin', {
        title: 'Student Log in',
        error: 'Incorrect Username or Password',
      });
    } else {
      const studentDetails = await studentModels.getStudentDetails(username);
      console.log(studentDetails);
      res.cookie(
        'studentToken',
        jwt.sign(
          {
            firstname: studentDetails.student_firstname,
            lastname: studentDetails.student_lastname,
            program_id: studentDetails.program_id,
            student_id: studentDetails.student_id,
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
const studentLogout = async (req, res) => {
  console.log('Student Logout Route!!!');
  res.clearCookie('studentToken');
  res.redirect('./login');
};
const showDashboard = async (req, res) => {
  console.log('Student Dashboard Route!!!');
  let totalinProgressCourses, totalCompletedCourses;

  const inProgressSections = await studentModels.getStudentSectionCodes(
    globalStudentId,
    'In Progress'
  );
  let attendanceData = [];
  let inProgressSectionsData = [];
  let totalClasses, totalPresents;
  let facultyName;
  let slotDetails;
  for (let i = 0; i < inProgressSections.length; i++) {
    totalClasses = await studentModels.getAttendanceData(
      globalStudentId,
      inProgressSections[i]
    );
    totalPresents = await studentModels.getAttendanceData(
      globalStudentId,
      inProgressSections[i],
      'Present'
    );
    inProgressSectionsData[i] = await studentModels.getSectionDetails(
      inProgressSections[i]
    );
    if (inProgressSectionsData[i].faculty_id) {
      facultyName = await studentModels.getFacultyDetails(
        inProgressSectionsData[i].faculty_id
      );
      facultyName =
        facultyName.faculty_firstname + ' ' + facultyName.faculty_lastname;
    } else {
      facultyName = 'Faculty Member';
    }
    inProgressSectionsData[i].faculty_name = facultyName;

    slotDetails = await studentModels.getSlotDetails(
      inProgressSectionsData[i].slot_id
    );
    slotDetails = slotDetails.slot_day + ' ' + slotDetails.slot_time;
    inProgressSectionsData[i].slot_details = slotDetails;
    attendanceData[i] = Math.round((totalPresents / totalClasses) * 100);
    // console.log('THIS IS DATA', attendanceData[i]);
  }
  totalinProgressCourses = inProgressSections.length;
  const result2 = await studentModels.getStudentSectionCodes(
    globalStudentId,
    'Completed'
  );

  totalCompletedCourses = result2.length;

  const accountBalance = await studentModels.getStudentBalance(globalStudentId);
  res.render('studentdashboard', {
    page_name: 'dashboard',
    firstname: globalFirstname,
    lastname: globalLastname,
    totalinProgressCourses,
    totalCompletedCourses,
    accountBalance,
    inProgressSections,
    attendanceData,
    inProgressSectionsData,
  });
};
const showAttendancePage = async (req, res) => {
  console.log('Student attendance Route!!!');
  const { sectionCode, courseTitle } = req.query;

  let sectionCodes = await studentModels.getStudentSectionCodes(
    globalStudentId,
    'In Progress'
  );
  let sectionDetails = [];
  for (let i = 0; i < sectionCodes.length; i++) {
    sectionDetails.push(await studentModels.getSectionDetails(sectionCodes[i]));
  }

  console.log('SECTION DETAILS ', sectionDetails[0].section_code);
  let studentAttendance,
    totalAbsents = 0,
    totalPresents,
    totalClasses;
  if (sectionCode) {
    studentAttendance = await studentModels.getAttendance(
      globalStudentId,
      sectionCode
    );
    console.log(studentAttendance);
    studentAttendance.forEach((x) => {
      if (x.status == 'Absent') {
        totalAbsents++;
      }
    });

    totalClasses = studentAttendance.length;
    totalPresents = totalClasses - totalAbsents;
  }
  res.render('studentAttendance', {
    page_name: 'attendance',
    firstname: globalFirstname,
    lastname: globalLastname,
    sectionDetails,
    selectedSection: sectionCode,
    courseTitle,
    studentAttendance,
    totalClasses,
    totalAbsents,
    totalPresents,
  });
};
const showTimetablePage = async (req, res) => {
  console.log('Student TimeTable Route!!!');

  let slotDays = await studentModels.getAllDays();
  let slotTime = await studentModels.getAllTimeSlots();

  let inProgSections = await studentModels.getStudentSectionCodes(
    globalStudentId,
    'In Progress'
  );
  for (let i = 0; i < inProgSections.length; i++) {
    inProgSections[i] = await studentModels.getSectionDetails(
      inProgSections[i]
    );
    const { slot_day, slot_time } = await studentModels.getSlotDetails(
      inProgSections[i].slot_id
    );
    inProgSections[i].slot_day = slot_day;
    inProgSections[i].slot_time = slot_time;
  }

  console.log(inProgSections);
  res.render('studentTimeTable', {
    page_name: 'timetable',
    firstname: globalFirstname,
    lastname: globalLastname,
    slotDays,
    slotTime,
    inProgSections,
  });
};
const showAddCoursePage = async (req, res) => {
  console.log('Student AddCourse Route!!!');

  const mes = req.query.e;

  //Getting All Offered Sections
  const activeSections = await studentModels.getSections('Active');

  let sectionDetails = [];

  //Getting All Section Details
  for (let i = 0; i < activeSections.length; i++) {
    sectionDetails.push(
      await studentModels.getSectionDetails(activeSections[i])
    );
  }

  const asyncFilter = async (arr, predicate) => {
    const results = await Promise.all(arr.map(predicate));

    return arr.filter((_v, index) => results[index]);
  };
  //Filtering Course Catalog
  sectionDetails = await asyncFilter(sectionDetails, async (x) => {
    if (await studentModels.courseInCatalog(x.course_code, globalProgramID)) {
      return x;
    }
  });
  const coursesCompleted142 = await studentModels.getCoursesPassed(
    globalStudentId
  );

  //Filtering Already Completed Courses
  sectionDetails = await asyncFilter(sectionDetails, async (x) => {
    if (!coursesCompleted142.includes(x.course_code)) {
      return x;
    }
  });
  //Filtering Courses Thats Are In Progress
  let inProgressSections = await studentModels.getStudentSectionCodes(
    globalStudentId,
    'In Progress'
  );

  let inProgressCourses = [];
  for (let i = 0; i < inProgressSections.length; i++) {
    inProgressCourses.push(
      await studentModels.getSectionCourseCode(inProgressSections[i])
    );
  }

  sectionDetails = await asyncFilter(sectionDetails, async (x) => {
    if (!inProgressCourses.includes(x.course_code)) {
      return x;
    }
  });
  let alreadyRegisteredCourses = await studentModels.getStudentSectionCodes(
    globalStudentId,
    'Active'
  );
  //Final Sections
  for (let i = 0; i < sectionDetails.length; i++) {
    sectionDetails[i].course_type = await studentModels.courseType(
      sectionDetails[i].course_code,
      globalProgramID
    );
    await Object.assign(
      sectionDetails[i],
      await studentModels.getFacultyDetails(sectionDetails[i].faculty_id)
    );
    await Object.assign(
      sectionDetails[i],
      await studentModels.getTimeSlot(sectionDetails[i].slot_id)
    );
    let bookedSeats = await studentModels.getBookedSeats(
      sectionDetails[i].section_code
    );
    sectionDetails[i].seats = sectionDetails[i].seats - bookedSeats;
    sectionDetails[i].encryptedValue = cryptr.encrypt(
      sectionDetails[i].section_code
    );
    if (alreadyRegisteredCourses.includes(sectionDetails[i].section_code)) {
      sectionDetails[i].registered = true;
    } else {
      sectionDetails[i].registered = false;
    }
  }

  res.render('studentAddCourse', {
    page_name: 'addcourse',
    firstname: globalFirstname,
    lastname: globalLastname,
    activeCourses: sectionDetails,
    mes,
  });
};
const showDropCoursePage = async (req, res) => {
  console.log('Student DropCourse Route!!!');

  let sectionCodes = await studentModels.getStudentSectionCodes(
    globalStudentId,
    'In Progress'
  );
  console.log(sectionCodes);
  let sectionDetails = [];

  //Getting All Section Details
  for (let i = 0; i < sectionCodes.length; i++) {
    sectionDetails.push(await studentModels.getSectionDetails(sectionCodes[i]));
  }
  console.log(sectionDetails);
  sectionDetails.map((x) => {
    x.encryptedValue = cryptr.encrypt(x.section_code);
  });
  res.render('studentDropCourse', {
    page_name: 'dropcourse',
    firstname: globalFirstname,
    lastname: globalLastname,
    courses: sectionDetails,
  });
};
const showViewMarksPage = async (req, res) => {
  console.log('Student ViewMarks Route!!!');
  const {
    selectedSemester,
    selectedCourseCode,
    selectedCourseTitle,
    selectedSectionCode,
  } = req.query;

  let courses = [],
    marks;

  let semesters = [],
    semesterIDs = [];
  const sectionCodes = await studentModels.getStudentSectionCodes(
    globalStudentId
  );
  console.log('These are student Section Code : ', sectionCodes);
  let tableName;
  for (let i = 0; i < sectionCodes.length; i++) {
    tableName = sectionCodes[i].replace('-', '');
    if (await studentModels.checkTableExsists(tableName)) {
      const { semester_id } = await studentModels.getSectionDetails(
        sectionCodes[i]
      );

      if (!semesterIDs.includes(semester_id)) {
        semesterIDs.push(semester_id);
        const semesterName = await studentModels.getSemesterName(semester_id);
        semesters.push(semesterName);
      }
    }
  }
  if (selectedSemester) {
    console.log(selectedSemester);
    const semesterID = await studentModels.getSemesterIDbyName(
      selectedSemester
    );

    const sectionCodes = await studentModels.getStudentSemesterDetails(
      globalStudentId,
      semesterID
    );
    console.log('THESE ARE : ', sectionCodes);

    for (let i = 0; i < sectionCodes.length; i++) {
      if (
        await studentModels.checkTableExsists(sectionCodes[i].replace('-', ''))
      ) {
        courses[i] = await studentModels.getSectionDetails(sectionCodes[i]);
      }
    }
  }

  let marksDetail,
    grade,
    totalMarks = 0;
  if (selectedSectionCode !== undefined) {
    let sectionDetails = await studentModels.getSectionDetails(
      selectedSectionCode
    );

    marksDetail = await studentModels.getMarksDetail(
      selectedSectionCode,
      globalStudentId
    );
    delete marksDetail.student_id;

    if (!sectionDetails.hod_lock) {
      delete marksDetail.Final;
      delete marksDetail.totalFinal;
    } else {
      let marksType = Object.keys(marksDetail);
      marksType.forEach((x) => {
        if (!x.includes('total')) {
          totalMarks += Math.round(parseFloat(marksDetail[x]));
        }
      });

      grade = await studentModels.getGrade(totalMarks);
    }

    console.log('This is selected Course', selectedSectionCode);
  }
  res.render('studentViewMarks', {
    page_name: 'viewmarks',
    firstname: globalFirstname,
    lastname: globalLastname,
    semesters,
    selectedSemester,
    selectedSectionCode,
    selectedCourseCode,
    selectedCourseTitle,
    courses,
    marksDetail,
    marks,
    grade,
    totalMarks,
  });
};

const showCourseCatalog = async (req, res) => {
  console.log('Student CourseCatalog Route!!!');

  const courseCatalog = await studentModels.getCourseCatalog(globalProgramID);
  res.render('studentCourseCatalog', {
    page_name: 'coursecatalog',
    firstname: globalFirstname,
    lastname: globalLastname,
    courseCatalog,
  });
};
const showRoadMap = async (req, res) => {
  console.log('Student RoadMap Route!!!');

  res.render('studentRoadMap', {
    page_name: 'roadmap',
    firstname: globalFirstname,
    lastname: globalLastname,
  });
};
const showFees = async (req, res) => {
  console.log('Student fees Route!!!');
  const { amount, mes } = req.query;

  let { account_amount } = await studentModels.getStudentDetails(
    globalStudentId
  );
  console.log(account_amount);
  res.render('studentFees', {
    page_name: 'fees',
    firstname: globalFirstname,
    lastname: globalLastname,
    globalStudentId,
    account_amount,
    amount,
    mes,
  });
};

const studentAddBalance = async (req, res) => {
  console.log('Post Route Add Balance');
  const { amount } = req.body;
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'pkr',
          product_data: {
            name: 'University Fee Payment',
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `http://localhost:3000/studentportal/addAmountinAccount?amount=${amount}&mes=1`,
    cancel_url: `https://github.com/zuhayrtariq/stripe-working-no-cors/blob/master/index.js`,
  });

  res.redirect(303, session.url);
};
const AddAmountInAccount = async (req, res) => {
  console.log('Add Amount in Account Route');
  const { amount, mes } = req.query;
  await studentModels.addStudentBalance(globalStudentId, amount);

  res.redirect(`./fees?amount=${amount}&mes=${mes}`);
};
const showStudentProfile = async (req, res) => {
  console.log('Student Profile Route!!!');
  res.render('studentProfile', {
    page_name: 'Profile',
    username: globalStudentId,
    firstname: globalFirstname,
    lastname: globalLastname,
  });
};

const studentRegisterCourse = async (req, res) => {
  console.log('Student Register Course POST Route!!!');
  let { sectionCode } = req.body;

  async function checkCourseRegister() {
    try {
      sectionCode = cryptr.decrypt(sectionCode);
    } catch (e) {
      res.send('ERROR');
      return 0;
    }
    const sectionData = await studentModels.getSectionDetails(sectionCode);
    console.log('THIS IS SECTION DATA : ', sectionData);
    const accountBalance = await studentModels.getStudentBalance(
      globalStudentId
    );
    const pricePerCH = 5000;
    const courseCode = sectionData.course_code;
    const timeSlot = sectionData.slot_id;
    const totalSeats = sectionData.seats;
    const creditHours = parseInt(sectionData.course_credithours);
    const sectionPrice = pricePerCH * creditHours;
    const activeSections = await studentModels.getStudentSectionCodes(
      globalStudentId,
      'Active'
    );
    let totalCH = parseInt(sectionData.course_credithours);
    let sectionDetails = [];
    for (let i = 0; i < activeSections.length; i++) {
      sectionDetails[i] = await studentModels.getSectionDetails(
        activeSections[i]
      );

      totalCH = totalCH + parseInt(sectionDetails[i].course_credithours);
    }
    console.log('TOTAL CH', totalCH);

    //CHECKING COURSES CREDIT HOURS
    if (totalCH > 4) {
      console.log('MAX COURSE LIMIT');
      res.redirect('./addcourse?e=1');
      return;
    }
    //CHECKING IF SEATS ARE AVAILABLE
    let bookedSeats = await studentModels.getBookedSeats(sectionCode);
    console.log(bookedSeats);
    if (bookedSeats >= totalSeats) {
      console.log('NO MORE SEATS');
      res.redirect('./addcourse?e=2');
      return;
    }
    //CHECKING IF COURSE IS ALREADY REGISTERED
    const courseCodes = sectionDetails.map((x) => {
      return x.course_code;
    });
    if (courseCodes.includes(courseCode)) {
      console.log('COURSE ALREADY EXIST');
      res.redirect('./addcourse?e=3');
      return;
    }
    const slotIDs = sectionDetails.map((x) => {
      return x.slot_id;
    });

    if (slotIDs.includes(timeSlot)) {
      console.log('TIME CLASh');
      res.redirect('./addcourse?e=4');
      return;
    }
    if (accountBalance < sectionPrice) {
      console.log('insufficient Amount');
      res.redirect('./addcourse?e=5');
      return;
    }
    // console.log('Time slots are', timeSlots);
    //CHECKING TIME SLOT
    // const [result2] = await pool.query(
    //   `SELECT student_registered_courses.section_code, section_details.slot_id, student_details.student_id
    //   FROM student_registered_courses
    //     LEFT JOIN section_details ON student_registered_courses.section_code = section_details.section_code
    //     LEFT JOIN student_details ON student_registered_courses.student_id = student_details.student_id
    //   WHERE section_details.slot_id  IN ? AND student_details.student_id = ? LIMIT 1 `,
    //   [courseCode, globalStudentId]
    // );
    else {
      await studentModels.addStudentBalance(globalStudentId, -sectionPrice);
      registerCourse(sectionCode);
    }
  }

  //REGISTER COURSE
  try {
    checkCourseRegister();
  } catch (e) {
    console.log('ERROR');
  }
  async function registerCourse(sectionCode) {
    await studentModels.registerCourse(globalStudentId, sectionCode);

    res.redirect('./addcourse');
  }
};

const studentDropCourse = async (req, res) => {
  console.log('Student Drop Course POST Route!!!');

  let { sectionCode } = req.body;
  try {
    sectionCode = cryptr.decrypt(sectionCode);
  } catch (e) {
    res.send('ERROR');
    return 0;
  }
  // const sectionData = await studentModels.getSectionDetails(sectionCode);
  // const creditHours = parseInt(sectionData.course_credithours);
  // const sectionPrice = 5000 * creditHours;
  // await studentModels.addStudentBalance(globalStudentId, sectionPrice);
  await studentModels.unRegisterCourse(globalStudentId, sectionCode);
  res.redirect('./dropcourse');
};
const studentUnRegisterCourse = async (req, res) => {
  console.log('Student UnRegister Course POST Route!!!');
  let { sectionCode } = req.body;
  sectionCode = cryptr.decrypt(sectionCode);
  const sectionData = await studentModels.getSectionDetails(sectionCode);
  const creditHours = parseInt(sectionData.course_credithours);
  const sectionPrice = 5000 * creditHours;
  await studentModels.addStudentBalance(globalStudentId, sectionPrice);
  await studentModels.unRegisterCourse(globalStudentId, sectionCode);
  res.redirect('./addcourse');
};
function mustBeLoggedIn(req, res, next) {
  jwt.verify(req.cookies.studentToken, jwtPrivateKey, function (err, decoded) {
    if (err) {
      res.redirect('./login');
    } else {
      globalProgramID = decoded.program_id;
      globalFirstname = decoded.firstname;
      globalLastname = decoded.lastname;
      globalStudentId = decoded.student_id;
      next();
    }
  });
}

module.exports = {
  showLoginPage,
  studentLogin,
  studentLogout,
  showDashboard,
  showAttendancePage,
  showTimetablePage,
  showAddCoursePage,
  showDropCoursePage,
  showViewMarksPage,
  showFees,
  showRoadMap,
  showCourseCatalog,
  showStudentProfile,
  studentRegisterCourse,
  studentDropCourse,
  studentUnRegisterCourse,
  studentAddBalance,
  AddAmountInAccount,
};

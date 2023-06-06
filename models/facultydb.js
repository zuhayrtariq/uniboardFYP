const pool = require('../connection');

//faculty Details
async function facultyLogIn(username, password) {
  const [result] = await pool.query(
    `SELECT * FROM faculty_accounts WHERE username = ? AND BINARY password = ? LIMIT 1`,
    [username, password]
  );
  return result;
}

async function getFacultyDetails(facultyID) {
  const [facultyDetails] = await pool.query(
    `SELECT * FROM faculty_details WHERE faculty_username = ?  LIMIT 1`,
    [facultyID]
  );
  return facultyDetails[0];
}

//CHECK IF MARKS TABLE EXSISTS
async function checkTableExsists(tableName) {
  let [result] = await pool.query(
    `SELECT * 
  FROM information_schema.tables
  WHERE table_schema = 'uniboard' 
      AND table_name = ?
  LIMIT 1;`,
    [tableName]
  );
  if (result.length) {
    return true;
  } else {
    return false;
  }
}
async function createMarksTable(sectionCode, markingScheme) {
  let tableName = sectionCode.replace('-', '');
  await pool.query(
    `  CREATE TABLE ${tableName} (
    student_id varchar(11),
    PRIMARY KEY (student_id),
    FOREIGN KEY (student_id) REFERENCES student_details(student_id)
  )`
  );
  for (let x = 0; x < markingScheme.length; x++) {
    await pool.query(`ALTER TABLE ${tableName}
    ADD ${markingScheme[x].name} float DEFAULT 0 NOT NULL check (${markingScheme[x].name} between 0 and ${markingScheme[x].totalMarks}) ;`);
  }
  let [result] = await pool.query(
    `SELECT * FROM student_section_details WHERE section_code = ?`,
    [sectionCode]
  );

  for (let i = 0; i < result.length; i++) {
    await pool.query(
      `INSERT INTO ${tableName} (student_id) VALUES (?);;
    `,
      result[i].student_id
    );
  }
}
async function getMarksType(sectionCode) {
  let [result] = await pool.query(
    `SELECT *
  FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
  WHERE  TABLE_NAME = ?;`,
    [sectionCode.replace('-', '')]
  );
  let marksType = [],
    totalMarks = [];
  let temp;
  for (let i = 0; i < result.length; i++) {
    marksType[i] = result[i].CONSTRAINT_NAME;

    temp = result[i].CHECK_CLAUSE;
    temp = temp.split('and ').pop();
    totalMarks[i] = parseInt(temp);
  }

  return { marksType, totalMarks };
}

async function getGrade(marks) {
  const [result] = await pool.query(
    `SELECT * FROM grading_scheme WHERE ? >= min_marks AND ? <= max_marks LIMIT 1
  `,
    [marks, marks]
  );
  return result[0].grade;
}
async function getGPA(grade) {
  const [result] = await pool.query(
    `SELECT * FROM grades WHERE grade = ? LIMIT 1
  `,
    [grade]
  );
  return result[0].score;
}
async function getSectionMarks(sectionCode) {
  sectionCode = sectionCode.replace('-', '');
  let [result] = await pool.query(`SELECT * FROM ${sectionCode}`);
  for (let i = 0; i < result.length; i++) {
    let { student_firstname, student_lastname } = await getStudentDetails(
      result[i].student_id
    );
    result[i].student_firstname = student_firstname;
    result[i].student_lastname = student_lastname;
  }
  return result;
}
async function updateSectionMarks(
  sectionCode,
  studentIDs,
  allMarks,
  marksType
) {
  sectionCode = sectionCode.replace('-', '');

  let z = 0,
    temp;
  for (let i = 0; i < studentIDs.length; i++) {
    for (let j = 0; j < marksType.length; j++) {
      temp = allMarks[z];
      z++;
      await pool.query(
        `UPDATE ${sectionCode} SET ${marksType[j]} = ? WHERE student_id = ?`,
        [temp, studentIDs[i]]
      );
    }
  }
}
async function facultyGradeLock(sectionCode) {
  await pool.query(
    `UPDATE section_details SET faculty_lock = '1' WHERE section_details.section_code = ?;
  `,
    [sectionCode]
  );
}
async function getAllGradeData() {
  const [result] = await pool.query(
    `SELECT * FROM grades
  `
  );
  let result2;
  let allData = [];
  for (let i = 0; i < result.length; i++) {
    [result2] = await pool.query(
      `SELECT * FROM grading_scheme WHERE grade = ? LIMIT 1
    `,
      [result[i].grade]
    );
    // allData[i].min_marks = result2[0].min_marks;
    // allData[0].max_marks = result2[0].max_marks;
    // allData[0].grade = result2[0].grade;
    result2[0].score = result[i].score;
    allData.push(result2[0]);
    // result2[i] = result[i].gpa;
  }
  return allData;
}
//GET faculty SECTIONS (ALL OR SPECIFIC SEMESTERS)
async function getFacultySectionCodes(facultyID, status) {
  let result;
  if (status) {
    const semesterID = await getSemesterID(status);
    [result] = await pool.query(
      ` SELECT *
          FROM section_details
          WHERE faculty_id = ? AND semester_id IN (?)`,
      [facultyID, semesterID]
    );
  } else {
    [result] = await pool.query(
      ` SELECT *
      FROM section_details
      WHERE faculty_id = ? `,
      [facultyID]
    );
  }
  result = await result.map((x) => {
    return x.section_code;
  });
  return result;
}

//GET SECTION DETAILS
async function getSectionDetails(sectionCode) {
  let [result] = await pool.query(
    `SELECT * FROM section_details WHERE section_code = ?`,
    [sectionCode]
  );

  const courseDetails = await getCourseDetails(result[0].course_code);
  await Object.assign(result[0], courseDetails);

  return result[0];
}

//GET COURSE DETAILS
async function getCourseDetails(courseCode) {
  const [result] = await pool.query(
    `SELECT * FROM courses WHERE course_code = ?`,
    [courseCode]
  );
  return result[0];
}

//GET SEMESTER ID BY STATUS
async function getSemesterID(status) {
  //Status = [Active, In Progress, Completed]
  let [result] = await pool.query(
    `SELECT semester_id FROM semester_details WHERE status = ?`,
    [status]
  );
  result = await result.map((x) => {
    return x.semester_id;
  });

  return result;
}

async function getSemesterDetails(semesterID) {
  //Status = [Active, In Progress, Completed]
  let [result] = await pool.query(
    `SELECT * FROM semester_details WHERE semester_id = ?`,
    [semesterID]
  );
  return result[0];
}

//GET SEMESTER ID BY NAME
async function getSemesterIDbyName(semesterName) {
  let [result] = await pool.query(
    `SELECT semester_id FROM semester_details WHERE semester_name = ?`,
    [semesterName]
  );
  return result[0].semester_id;
}

//GET SEMESTER NAME
async function getSemesterName(semesterID) {
  //Status = [Active, In Progress, Completed]
  let [result] = await pool.query(
    `SELECT semester_name FROM semester_details WHERE semester_id = ?`,
    [semesterID]
  );
  return result[0].semester_name;
}

//faculty ENROLLED COURSES IN WHICH SEMESTERS
async function getfacultySemesterDetails(facultyID, semesterID) {
  let [result] = await pool.query(
    `SELECT faculty_section_details.*, section_details.semester_id
  FROM faculty_section_details 
    LEFT JOIN section_details ON faculty_section_details.section_code = section_details.section_code
    WHERE faculty_id = ? AND semester_id = ?;`,
    [facultyID, semesterID]
  );
  result = result.map((x) => {
    return x.section_code;
  });
  return result;
}

//GET ATTENDANCE
async function getAttendance(facultyID, sectionCode) {
  const [result] = await pool.query(
    `SELECT * FROM attendance WHERE faculty_id = ? AND section_code = ?`,
    [facultyID, sectionCode]
  );
  return result;
}

async function getAllDays() {
  const q_getSlotDays = `SELECT DISTINCT slot_day
    FROM time_slots;`;
  let [slotDays] = await pool.query(q_getSlotDays);
  return slotDays;
}
async function getAllTimeSlots() {
  const q_getSlotTime = `SELECT DISTINCT slot_time
    FROM time_slots;`;

  let [slotTime] = await pool.query(q_getSlotTime);
  return slotTime;
}

async function courseInCatalog(courseCode, programID) {
  const [result] = await pool.query(
    `SELECT * FROM course_catalog WHERE course_code = ? AND program_id = ?`,
    [courseCode, programID]
  );
  if (result.length) {
    return true;
  } else {
    return false;
  }
}
async function getTimeSlot(slotID) {
  const [result] = await pool.query(
    `SELECT * FROM time_slots WHERE slot_id = ?`,
    [slotID]
  );
  return result[0];
}
async function courseType(courseCode, programID) {
  const [result] = await pool.query(
    `SELECT course_type FROM course_catalog WHERE course_code = ? AND program_id = ?`,
    [courseCode, programID]
  );
  return result[0].course_type;
}
async function getSectionCourseCode(sectionCode) {
  let [result] = await pool.query(
    `SELECT course_code FROM section_details WHERE section_code = ?`,
    [sectionCode]
  );
  return result[0].course_code;
}
async function getBookedSeats(sectionCode) {
  let [result] = await pool.query(
    `SELECT COUNT(*) AS seat FROM faculty_section_details WHERE section_code= ? `,
    [sectionCode]
  );
  return result[0].seat;
}

//GET ALL SECTIONS ON SEMESTER STATUS
async function getSlotDetails(slotID) {
  let [result] = await pool.query(
    `SELECT * FROM time_slots WHERE slot_id = ?`,
    [slotID]
  );
  return result[0];
}
async function registerCourse(facultyID, sectionCode) {
  await pool.query(
    `INSERT INTO faculty_section_details (faculty_id, section_code, grade) VALUES (?, ?, NULL);`,
    [facultyID, sectionCode]
  );
}
async function unRegisterCourse(facultyID, sectionCode) {
  await pool.query(
    `DELETE FROM faculty_section_details WHERE faculty_section_details.faculty_id = ? AND faculty_section_details.section_code = ?`,
    [facultyID, sectionCode]
  );
}
async function getSections(status) {
  const semesterID = await getSemesterID(status);
  let [result] = await pool.query(
    `SELECT section_code FROM section_details WHERE semester_id IN (?)`,
    [semesterID]
  );
  result = await result.map((x) => {
    return x.section_code;
  });
  return result;
}

//COURSE CATALOG
async function getCourseCatalog(programID) {
  let [result] = await pool.query(
    `SELECT course_catalog.*, course_catalog.program_id, courses.*
        FROM course_catalog 
          LEFT JOIN courses ON course_catalog.course_code = courses.course_code
        WHERE course_catalog.program_id = ?
        ORDER BY course_catalog.semester;`,
    [programID]
  );
  return result;
}

//COURSES CLEARS faculty
async function getCoursesPassed(facultyID) {
  let [result] = await pool.query(
    `SELECT section_code FROM faculty_section_details WHERE faculty_id = ? AND grade != 'F' AND grade IS NOT NULL`,
    [facultyID]
  );
  for (let i = 0; i < result.length; i++) {
    result[i] = await getSectionCourseCode(result[i].section_code);
  }

  return result;
}

async function getAttendanceData(sectionCode, date) {
  let [result] = await pool.query(
    `SELECT * FROM attendance WHERE section_code = ? AND date = ? `,
    [sectionCode, date]
  );
  return result;
}

async function getStudentDetails(studentID) {
  const [studentDetails] = await pool.query(
    `SELECT student_firstname,student_lastname FROM student_details WHERE student_id = ?  LIMIT 1`,
    [studentID]
  );
  return studentDetails[0];
}
async function getStudentIDinSection(sectionCode) {
  const [result] = await pool.query(
    `SELECT student_id FROM student_section_details WHERE section_code = ? `,
    [sectionCode]
  );
  return result;
}
async function getTotalStudentAbsents(studentID, sectionCode) {
  const [result] = await pool.query(
    `SELECT COUNT(*) as absents FROM attendance WHERE student_id = ? AND status = 'Absent' AND section_code = ?`,
    [studentID, sectionCode]
  );
  return result[0].absents;
}

async function uploadAttendance(studentID, sectionCode, date, status) {
  await pool.query(
    `INSERT INTO attendance (student_id, section_code, status, date) VALUES (?, ?, ?, ?);`,
    [studentID, sectionCode, status, date]
  );
}

async function updateAttendance(studentID, sectionCode, date, status) {
  await pool.query(
    `UPDATE attendance SET status = ? WHERE student_id = ? AND section_code = ? AND date = ?;`,
    [status, studentID, sectionCode, date]
  );
}

async function facultyCourseRequests(facultyID) {
  let [result] = await pool.query(
    `SELECT section_code FROM faculty_course_request WHERE faculty_id=?;`,
    [facultyID]
  );
  result = result.map((x) => {
    return x.section_code;
  });
  return result;
}
async function checkCourseInDepartment(courseCode, DepartmentId) {
  const [result] = await pool.query(
    `SELECT * FROM courses WHERE course_code = ? AND department_id = ? LIMIT 1; `,
    [courseCode, DepartmentId]
  );
  if (result.length) {
    return true;
  } else {
    return false;
  }
}

async function getAvailableCourses(
  DepartmentID,
  bookedTimeSlots,
  requestedSections,
  status
) {
  if (status === 1) {
    const [availableCourses] = await pool.query(
      `SELECT section_details.*, courses.department_id, courses.course_code, courses.course_title, courses.course_credithours, time_slots.*
  FROM section_details 
    LEFT JOIN courses ON section_details.course_code = courses.course_code 
    LEFT JOIN time_slots ON section_details.slot_id = time_slots.slot_id
  WHERE courses.department_id = ? AND section_details.faculty_id IS NULL AND section_details.slot_id NOT IN (?) AND section_details.section_code NOT IN (?)`,
      [DepartmentID, bookedTimeSlots, requestedSections]
    );
    return availableCourses;
  } else {
    const [availableCourses] = await pool.query(
      `SELECT section_details.*, courses.department_id, courses.course_code, courses.course_title, courses.course_credithours, time_slots.*
    FROM section_details 
      LEFT JOIN courses ON section_details.course_code = courses.course_code 
      LEFT JOIN time_slots ON section_details.slot_id = time_slots.slot_id
    WHERE courses.department_id = ? AND section_details.faculty_id IS NULL AND section_details.slot_id NOT IN (?) AND section_details.section_code IN (?)`,
      [DepartmentID, bookedTimeSlots, requestedSections]
    );
    return availableCourses;
  }
}
async function requestNewCourse(sectionCode, facultyID) {
  await pool.query(
    `INSERT INTO faculty_course_request (section_code, faculty_id) VALUES (?, ?);`,
    [sectionCode, facultyID]
  );
}
async function cancelRequestNewCourse(sectionCode, facultyID) {
  await pool.query(
    `DELETE FROM faculty_course_request WHERE faculty_course_request .section_code = ? AND faculty_course_request .faculty_id = ?`,
    [sectionCode, facultyID]
  );
}

async function facultyOfferedCourses(facultyID) {
  const [result] = await pool.query(
    `SELECT section_details.*, semester_details.status, courses.course_title, time_slots.*
    FROM section_details 
      LEFT JOIN semester_details ON section_details.semester_id = semester_details.semester_id 
      LEFT JOIN courses ON section_details.course_code = courses.course_code 
      LEFT JOIN time_slots ON section_details.slot_id = time_slots.slot_id
    WHERE section_details.faculty_id = ? AND semester_details.status = 'Active';`,
    [facultyID]
  );
  return result;
}

async function sectionsWithoutRoomRequest(facultyID) {
  const [result] = await pool.query(
    `SELECT section_details.*, semester_details.status, courses.course_title, time_slots.*
  FROM section_details 
    LEFT JOIN semester_details ON section_details.semester_id = semester_details.semester_id 
    LEFT JOIN courses ON section_details.course_code = courses.course_code 
    LEFT JOIN time_slots ON section_details.slot_id = time_slots.slot_id
     LEFT JOIN faculty_room_request ON section_details.section_code = faculty_room_request.section_code
  WHERE section_details.faculty_id = ? AND semester_details.status = 'Active' AND section_details.room_id IS NULL AND faculty_room_request.section_code IS NULL;`,
    [facultyID]
  );
  return result;
}
async function checkLabReq(sectionCode) {
  const [result] = await pool.query(
    ` SELECT section_details.section_code, courses.lab_required
  FROM section_details 
    LEFT JOIN courses ON section_details.course_code = courses.course_code
    WHERE section_details.section_code = ?;`,
    [sectionCode]
  );
  if (result[0].lab_required) {
    return true;
  } else {
    return false;
  }
}
async function getBookedRooms(slotID) {
  let [result] = await pool.query(
    `  SELECT section_details.*, semester_details.status
  FROM section_details 
    LEFT JOIN semester_details ON section_details.semester_id = semester_details.semester_id
  WHERE section_details.room_id IS NOT NULL AND section_details.slot_id = ? AND semester_details.status = 'Active';`,
    [slotID]
  );
  result = result.map((x) => {
    return x.room_id;
  });
  return result;
}
async function getAllRooms(status) {
  if (status === 1) {
    const [result] = await pool.query(
      `SELECT * from rooms WHERE building_name = 'CCSIS'`
    );
    return result;
  } else if (status === 2) {
    const [result] = await pool.query(
      `SELECT * from rooms WHERE building_name != 'CCSIS'`
    );
    return result;
  } else {
    const [result] = await pool.query(`SELECT * from rooms`);
    return result;
  }
}

async function getMaxFloor(building) {
  const [result] = await pool.query(
    `select building_floors from building WHERE building_name IN (?)  order by building_floors desc limit 0,1;`,
    [building]
  );
  return result[0].building_floors;
}

async function getFreeRooms(bookedRooms, building, floors) {
  let [result] = await pool.query(
    `select * from rooms WHERE room_id NOT IN (?) AND building_name IN (?)  AND room_floor IN (?);`,
    [bookedRooms, building, floors]
  );
  result = result.map((x) => {
    return x.room_id;
  });
  return result;
}
async function addNewRoomRequest(sectionCode, rooms) {
  rooms.forEach((room) => {
    pool.query(
      `INSERT INTO faculty_room_request (section_code, room_id) VALUES (?, ?)`,
      [sectionCode, room]
    );
  });
}
async function viewRoomRequests(facultyID) {
  let [sectionCodes] = await pool.query(
    `SELECT DISTINCT faculty_room_request.section_code
    FROM faculty_room_request 
      LEFT JOIN section_details ON faculty_room_request.section_code = section_details.section_code
      WHERE faculty_id = ?;`,
    [facultyID]
  );
  sectionCodes = sectionCodes.map((sectionCode) => {
    return sectionCode.section_code;
  });
  let roomRequestData;
  if (!sectionCodes.length) {
    return 0;
  } else {
    [roomRequestData] = await pool.query(
      `SELECT faculty_room_request.*
  FROM faculty_room_request
  WHERE faculty_room_request.section_code IN (?)
  `,
      [sectionCodes]
    );
    return { roomRequestData, sectionCodes };
  }
}

async function deleteRoomRequest(sectionCode) {
  await pool.query(`DELETE FROM faculty_room_request WHERE section_code = ? `, [
    sectionCode,
  ]);
}
module.exports = {
  getMarksType,
  deleteRoomRequest,
  viewRoomRequests,
  addNewRoomRequest,
  checkLabReq,
  getFreeRooms,
  getBookedRooms,
  getAllRooms,
  getMaxFloor,
  sectionsWithoutRoomRequest,
  facultyOfferedCourses,
  facultyLogIn,
  getSectionDetails,
  getFacultySectionCodes,
  cancelRequestNewCourse,
  getAttendance,
  getSections,
  courseInCatalog,
  getCoursesPassed,
  getSectionCourseCode,
  courseType,
  getBookedSeats,
  getFacultyDetails,
  getTimeSlot,
  getCourseCatalog,
  checkTableExsists,
  getSemesterName,
  getfacultySemesterDetails,
  getSemesterIDbyName,
  getAllDays,
  getAllTimeSlots,
  getSlotDetails,
  registerCourse,
  unRegisterCourse,
  getSemesterDetails,
  getAttendanceData,
  getStudentDetails,
  getStudentIDinSection,
  getTotalStudentAbsents,
  uploadAttendance,
  updateAttendance,
  facultyCourseRequests,
  checkCourseInDepartment,
  getAvailableCourses,
  requestNewCourse,
  createMarksTable,
  getSectionMarks,
  updateSectionMarks,
  getGrade,
  getGPA,
  getAllGradeData,
  facultyGradeLock,
};

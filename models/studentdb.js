const pool = require('../connection');

//Student Details
async function studentLogIn(username, password) {
  const [result] = await pool.query(
    `SELECT * FROM student_accounts WHERE username = ? AND BINARY password = ? LIMIT 1`,
    [username, password]
  );
  return result;
}

async function getStudentDetails(studentID) {
  const [studentDetails] = await pool.query(
    `SELECT * FROM student_details WHERE student_id = ?  LIMIT 1`,
    [studentID]
  );
  return studentDetails[0];
}
async function getStudentBalance(studentID) {
  let [result] = await pool.query(
    `SELECT account_amount FROM student_details WHERE student_details.student_id = ? LIMIT 1;
  `,
    [studentID]
  );

  result = parseInt(result[0].account_amount);
  return result;
}
async function addStudentBalance(studentID, amount) {
  let result = await getStudentBalance(studentID);
  amount = parseInt(amount);
  amount = amount + result;
  await pool.query(
    `UPDATE student_details SET account_amount = ? WHERE student_details.student_id = ?;
  `,
    [amount, studentID]
  );
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

//GET STUDENT SECTIONS (ALL OR SPECIFIC SEMESTERS)
async function getStudentSectionCodes(studentID, status) {
  let result;
  if (status) {
    const semesterID = await getSemesterID(status);
    [result] = await pool.query(
      ` SELECT student_section_details.*, section_details.*
          FROM student_section_details
          LEFT JOIN section_details ON student_section_details.section_code = section_details.section_code
          WHERE student_id = ? AND section_details.semester_id IN (?)`,
      [studentID, semesterID]
    );
  } else {
    [result] = await pool.query(
      ` SELECT * 
          FROM student_section_details 
          WHERE student_id = ? `,
      [studentID]
    );
  }
  result = await result.map((x) => {
    return x.section_code;
  });
  return result;
}
async function getMarksDetail(sectionCode, studentID) {
  sectionCode = sectionCode.replace('-', '');

  let [result] = await pool.query(
    `SELECT * FROM ${sectionCode} WHERE student_id = ?`,
    studentID
  );

  let [result2] = await pool.query(
    `SELECT *
  FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
  WHERE  TABLE_NAME = ?;`,
    [sectionCode]
  );
  let temp, tempkey;
  for (let i = 0; i < result2.length; i++) {
    temp = result2[i].CHECK_CLAUSE;

    tempkey = `total${result2[i].CONSTRAINT_NAME}`;
    temp = temp.split('and ').pop();
    result[0][tempkey] = parseInt(temp);
  }

  return result[0];
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

//GET FACULTY DETAILS
async function getFacultyDetails(facultyID) {
  const [result] = await pool.query(
    `SELECT * FROM faculty_details WHERE faculty_id = ?`,
    [facultyID]
  );
  return result[0];
}

//STUDENT ENROLLED COURSES IN WHICH SEMESTERS
async function getStudentSemesterDetails(studentID, semesterID) {
  let [result] = await pool.query(
    `SELECT student_section_details.*, section_details.semester_id
  FROM student_section_details 
    LEFT JOIN section_details ON student_section_details.section_code = section_details.section_code
    WHERE student_id = ? AND semester_id = ?;`,
    [studentID, semesterID]
  );
  result = result.map((x) => {
    return x.section_code;
  });
  return result;
}

//GET ATTENDANCE
async function getAttendance(studentID, sectionCode) {
  const [result] = await pool.query(
    `SELECT * FROM attendance WHERE student_id = ? AND section_code = ?`,
    [studentID, sectionCode]
  );
  return result;
}

async function getAttendanceData(studentID, sectionCode, status) {
  let result;
  if (!status) {
    [result] = await pool.query(
      `SELECT * FROM attendance WHERE student_id = ? AND section_code = ?`,
      [studentID, sectionCode]
    );
  } else {
    [result] = await pool.query(
      `SELECT * FROM attendance WHERE student_id = ? AND section_code = ? AND status = ?`,
      [studentID, sectionCode, status]
    );
  }

  return result.length;
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
    `SELECT COUNT(*) AS seat FROM student_section_details WHERE section_code= ? `,
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
async function registerCourse(studentID, sectionCode) {
  await pool.query(
    `INSERT INTO student_section_details (student_id, section_code, grade) VALUES (?, ?, NULL);`,
    [studentID, sectionCode]
  );
}
async function unRegisterCourse(studentID, sectionCode) {
  await pool.query(
    `DELETE FROM student_section_details WHERE student_section_details.student_id = ? AND student_section_details.section_code = ?`,
    [studentID, sectionCode]
  );
}
async function dropCourse(studentID, sectionCode) {
  await pool.query(
    `DELETE FROM student_section_details WHERE student_section_details.student_id = ? AND student_section_details.section_code = ?`,
    [studentID, sectionCode]
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

//COURSES CLEARS STUDENT
async function getCoursesPassed(studentID) {
  let [result] = await pool.query(
    `SELECT section_code FROM student_section_details WHERE student_id = ? AND grade != 'F' AND grade IS NOT NULL`,
    [studentID]
  );
  for (let i = 0; i < result.length; i++) {
    result[i] = await getSectionCourseCode(result[i].section_code);
  }

  return result;
}
async function getGrade(marks) {
  const [result] = await pool.query(
    `SELECT * FROM grading_scheme WHERE ? >= min_marks AND ? <= max_marks LIMIT 1
  `,
    [marks, marks]
  );
  return result[0].grade;
}
module.exports = {
  studentLogIn,
  getStudentDetails,
  getStudentSectionCodes,
  getSectionDetails,
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
  getStudentSemesterDetails,
  getSemesterIDbyName,
  getAllDays,
  getAllTimeSlots,
  getSlotDetails,
  registerCourse,
  unRegisterCourse,
  getMarksDetail,
  addStudentBalance,
  getStudentBalance,
  getAttendanceData,
  getGrade,
};

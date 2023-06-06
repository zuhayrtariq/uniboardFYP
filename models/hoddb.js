const pool = require('../connection');

async function hodLogIn(username, password) {
  const [result] = await pool.query(
    `SELECT * FROM faculty_accounts WHERE username = ? AND BINARY password = ? LIMIT 1`,
    [username, password]
  );
  return result;
}

async function getHodDetails(hodID) {
  const [hodDetails] = await pool.query(
    `SELECT * FROM faculty_details WHERE faculty_username = ?  LIMIT 1`,
    [hodID]
  );
  return hodDetails[0];
}
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

async function getSectionDetails(departmentID, status) {
  const [result] = await pool.query(
    `SELECT section_details.*, courses.department_id, courses.course_code, courses.course_title, courses.course_credithours, time_slots.*,
        faculty_details.faculty_id,faculty_details.faculty_firstname,faculty_details.faculty_lastname
  FROM section_details 
      LEFT JOIN courses ON section_details.course_code = courses.course_code 
        LEFT JOIN faculty_details ON section_details.faculty_id = faculty_details.faculty_id
      LEFT JOIN time_slots ON section_details.slot_id = time_slots.slot_id
      LEFT JOIN semester_details on section_details.semester_id = semester_details.semester_id
  WHERE courses.department_id = ? and semester_details.status=?`,
    [departmentID, status]
  );
  return result;
}
async function sectionsWithoutFaculty(departmentID) {
  const [result] = await pool.query(
    `SELECT section_details.*, courses.department_id, courses.course_code, courses.course_title, courses.course_credithours, time_slots.*,
          faculty_details.faculty_id,faculty_details.faculty_firstname,faculty_details.faculty_lastname
    FROM section_details 
        LEFT JOIN courses ON section_details.course_code = courses.course_code 
          LEFT JOIN faculty_details ON section_details.faculty_id = faculty_details.faculty_id
        LEFT JOIN time_slots ON section_details.slot_id = time_slots.slot_id
        LEFT JOIN semester_details on section_details.semester_id = semester_details.semester_id
    WHERE courses.department_id = ? AND semester_details.status='Active' AND section_details.faculty_id IS NULL`,
    [departmentID]
  );
  return result;
}
async function getAllDepartmentCourses(departmentID) {
  const [AllDepartmentCourses] = await pool.query(
    `SELECT *
  FROM courses 
  WHERE courses.department_id = ?`,
    [departmentID]
  );
  return AllDepartmentCourses;
}
async function getFacultyBookedSlots(slotID) {
  const [bookedFaculty] = await pool.query(
    ` SELECT section_details.*, semester_details.status
    FROM section_details 
      LEFT JOIN semester_details ON section_details.semester_id = semester_details.semester_id
    WHERE semester_details.status = 'Active' and slot_id = ? and faculty_id IS NOT NULL;`,
    [slotID]
  );
  if (!bookedFaculty.length) {
    return 0;
  } else {
    bookedFaculty = bookedFaculty.map((x) => {
      return x.faculty_id;
    });
    return bookedFaculty;
  }
}
async function getAllTimeSlots() {
  let [timeSlots] = await pool.query(
    `SELECT *
        FROM time_slots
        `
  );
  return timeSlots;
}
async function getFacultyDetails(departmentID, facultyID) {
  let [facultyDetails] = await pool.query(
    `SELECT faculty_id,faculty_firstname,faculty_lastname
            FROM faculty_details
            WHERE department_id = ? AND faculty_id = ?`,
    [departmentID, facultyID]
  );
  return facultyDetails;
}
async function getAllDepartmentFacultyIDs(departmentID) {
  let [result] = await pool.query(
    `SELECT faculty_id FROM faculty_details WHERE department_id = ? ORDER BY faculty_id`,
    [departmentID]
  );
  result = result.map((x) => {
    return x.faculty_id;
  });
  return result;
}

async function checkFacultyAvailability(facultyID, slotID, status) {
  let [result] = await pool.query(
    ` SELECT *
            FROM section_details
            LEFT JOIN semester_details ON section_details.semester_id = semester_details.semester_id
            WHERE faculty_id = ? AND semester_details.status = ?`,
    [facultyID, status]
  );
  result = await result.map((x) => {
    return x.slot_id;
  });

  slotID = parseInt(slotID);
  if (result.includes(slotID)) {
    return false;
  } else {
    return true;
  }
}

async function getSlotDetails(slotID) {
  let [selectedSlot] = await pool.query(
    `SELECT *
        FROM time_slots
        WHERE slot_id = ?
        `,
    [slotID]
  );
  return selectedSlot;
}
async function getNewSectionCode() {
  let [sectionCode] = await pool.query(
    `SELECT * FROM section_details ORDER BY section_details.section_code DESC LIMIT 1`
  );
  if (sectionCode.length) {
    sectionCode = sectionCode[0].section_code;
    console.log('THIS IS SECTION CODE : ', sectionCode);
    let secTag = sectionCode.slice(0, 2);
    sectionCode = sectionCode.slice(2);
    sectionCode = parseInt(sectionCode);
    console.log('THIS IS SECTION CODE : ', sectionCode);
    sectionCode++;
    sectionCode = sectionCode.toString();
    sectionCode = secTag + sectionCode;
  } else {
    sectionCode = 'M-1000';
  }
  return sectionCode;
}
async function offerNewSection(
  sectionCode,
  activeSem,
  courseCode,
  facultyID,
  timeSlot
) {
  if (!facultyID) {
    await pool.query(
      `INSERT INTO section_details (section_code, semester_id, course_code, faculty_id, slot_id, room_id, seats) VALUES (?, ?, ?,NULL,?,NULL, '40');`,
      [sectionCode, activeSem, courseCode, timeSlot]
    );
  } else {
    await pool.query(
      `INSERT INTO section_details (section_code, semester_id, course_code, faculty_id, slot_id, room_id, seats) VALUES (?, ?, ?, ?,?, NULL, '40');`,
      [sectionCode, activeSem, courseCode, facultyID, timeSlot]
    );
  }
}
async function deleteSectionRequest(sectionCode, facultyID) {
  await pool.query(
    `
          DELETE FROM faculty_course_request WHERE faculty_course_request.section_code = ? AND faculty_course_request.faculty_id = ?`,
    [sectionCode, facultyID]
  );
}
async function getFacultySectionRequests(departmentID) {
  const [result] = await pool.query(
    `SELECT faculty_course_request.*, faculty_details.faculty_firstname, faculty_details.faculty_lastname, courses.* FROM faculty_course_request LEFT JOIN faculty_details ON faculty_course_request.faculty_id = faculty_details.faculty_id LEFT JOIN section_details ON faculty_course_request.section_code = section_details.section_code LEFT JOIN courses ON section_details.course_code = courses.course_code WHERE courses.department_id = ?;`,
    [departmentID]
  );
  return result;
}
async function updateFacultySectionRequest(facultyID, sectionCode, status) {}
async function deleteOfferedSection(sectionCode) {
  await pool.query(
    `DELETE FROM section_details WHERE section_details.section_code = ?;`,
    [sectionCode]
  );
}
async function allotFaculty(facultyID, sectionCode) {
  await pool.query(
    `UPDATE section_details SET faculty_id = ? WHERE section_details.section_code = ?;`,
    [facultyID, sectionCode]
  );
}

async function hodGradeLock(sectionCode) {
  await pool.query(
    `UPDATE section_details SET hod_lock = '1' WHERE section_details.section_code = ?;
  `,
    [sectionCode]
  );
}

async function hodGradeUnlock(sectionCode) {
  await pool.query(
    `UPDATE section_details SET faculty_lock = '0' WHERE section_details.section_code = ?;
  `,
    [sectionCode]
  );
}
module.exports = {
  hodGradeLock,
  hodGradeUnlock,
  checkFacultyAvailability,
  deleteSectionRequest,
  getHodDetails,
  getNewSectionCode,
  getAllTimeSlots,
  hodLogIn,
  getSectionDetails,
  getAllDepartmentCourses,
  getFacultyBookedSlots,
  getFacultyDetails,
  getSlotDetails,
  offerNewSection,
  getFacultySectionRequests,
  updateFacultySectionRequest,
  deleteOfferedSection,
  allotFaculty,
  getAllDepartmentFacultyIDs,
  getSemesterID,
  sectionsWithoutFaculty,
};

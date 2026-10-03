const SPREADSHEET_ID = '1QfAzjWeYIbItgktYGpWSeja4G1ROieJy_NE2eED2JgE';
const FOLDER_NAME = 'Phukhieo School Medical Records';

// 1. ฟังก์ชันรับ Request จาก GitHub Pages (Frontend)
function doPost(e) {
  let result = { status: 'error', message: 'Unknown Action' };
  
  try {
    // แปลง JSON ที่ถูกส่งมาจาก fetch() 
    let payload = JSON.parse(e.postData.contents);
    let action = payload.action;

    if (action === 'login') {
      result = checkLogin(payload.username, payload.password);
    } else if (action === 'searchPatient') {
      result = searchPatient(payload.query, payload.searchType);
    } else if (action === 'upload') {
      result = { status: 'success', url: uploadImage(payload.base64, payload.filename) };
    }
    // ... สามารถเพิ่มเงื่อนไข Action อื่นๆ ได้เช่น saveOPD
    
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }

  // ส่งค่ากลับไปหา GitHub เป็นรูปแบบ JSON
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ตอบกลับ doGet ป้องกัน Error เวลาเข้า URL ตรงๆ
function doGet(e) {
  return ContentService.createTextOutput("Phukhieo Medical API is Running...")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ----------------------------------------------------
// ฟังก์ชันจัดการฐานข้อมูล
// ----------------------------------------------------
function checkLogin(username, password) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('admin');
  const data = sheet.getDataRange().getDisplayValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return {
        status: 'success',
        user: data[i][0],
        name: data[i][2],
        systemLocation: data[i][3], // Admin, Doctor, Teacher
        medicalPosition: data[i][4]
      };
    }
  }
  return { status: 'error', message: 'Username หรือ Password ไม่ถูกต้อง' };
}

function searchPatient(query, searchType) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('data');
  const data = sheet.getDataRange().getDisplayValues();
  
  let colIndex = { 'hn': 4, 'studentNum': 5, 'nationalId': 6, 'name': 7 }[searchType];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex] === query) {
      return { status: 'success', data: data[i] };
    }
  }
  return { status: 'error', message: 'ไม่พบข้อมูลผู้ป่วย' };
}

function uploadImage(base64Data, filename) {
  try {
    let folders = DriveApp.getFoldersByName(FOLDER_NAME);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
    let splitBase = base64Data.split(',');
    let type = splitBase[0].split(';')[0].replace('data:', '');
    let byteCharacters = Utilities.base64Decode(splitBase[1]);
    let blob = Utilities.newBlob(byteCharacters, type, filename);
    let file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?export=view&id=' + file.getId();
  } catch (e) {
    return 'Error: ' + e.toString();
  }
}

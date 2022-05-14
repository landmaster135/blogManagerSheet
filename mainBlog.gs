function moveFileToFolder(postedList) {
  // declare for prepare.
  var alreadyPostedList = getAlreadyPostedList(postedList);
  var alreadyPostedListWithoutPermalink =[];
  alreadyPostedList.forEach(function(values) {
    alreadyPostedListWithoutPermalink.push(values[0]);
  });
  
  // declare for get list of folders.
  var folder_id = IMAGE_TMP_FOLDER_ID, // Folder ID of image for article.
    folder,
    folders,
    folder_now,
    key_date_folder,
    folderDict = {},
    prefix_folder = "◆完了分_", // prefix of folder of image for article already posted.
    date_format_8   = "yyyyMMdd",
    date_format_6   = "yyyyMM";

  // get list of folders.
  folder = DriveApp.getFolderById(folder_id);
  folders = folder.getFolders();
  while(folders.hasNext()) {
    folder_now = folders.next();
    if (prefix_folder == folder_now.getName().substring(0, prefix_folder.length)) {
      key_date_folder = folder_now.getName().substring(prefix_folder.length, prefix_folder.length + date_format_6.length);
      folderDict[key_date_folder] = folder_now.getId();
    }
  }

  // declare for get list of image files.
  var files,
    file,
    key_date_file_6,
    key_date_file_8,
    fileList = [];

  // get list of image files.
  files = folder.getFiles();
  while(files.hasNext()) {
    file = files.next();
    key_date_file_6 = file.getName().substring(0, date_format_6.length);
    key_date_file_8 = file.getName().substring(0, date_format_8.length);
    
    if (alreadyPostedListWithoutPermalink.find(key => key === key_date_file_8) != null) {
      fileList.push([key_date_file_8, key_date_file_6, file.getId()]);
    }
  }
  console.log(fileList);

  // declare for move file to folder
  var targetFile, toFolder;

  // move file to folder
  fileList.forEach(function(movingList) {
    if (movingList[1] != "") {
      targetFile = DriveApp.getFileById(movingList[2]);
      toFolder   = DriveApp.getFolderById(folderDict[movingList[1]]);
      targetFile.moveTo(toFolder);
    }
  });

}

function getAlreadyPostedList(postedList) {
  // declare for prepare.
  var alreadyPostedList = [], alreadyPostedChr = '済';

  // get list of aticle already posted.
  postedList.forEach(function(value) {
    if(value[1] == alreadyPostedChr) {
      alreadyPostedList.push([value[0], value[2]]);
    }
  });

  return alreadyPostedList;
}

function readGssColumns() {
  // declare for prepare.
  var ss,
    sheet,
    postedNumber,
    row_for_postedNumber = 6;
  ss = SpreadsheetApp.getActive();
  sheet = ss.getSheetByName(sheetNameDisseminating1st);
  postedNumber = Number(sheet.getRange(row_for_postedNumber, column_for_postedNumber_1st).getValue());
  console.log(`postedNumber is ${postedNumber}`);
  
  // declare for get list from GSS.
  var dateList   = [],
    dateList_formated = [],
    permalinkList   = [],
    permalinkList_formated = [],
    postedList = [],
    i = 2, // index of row to start reading sheet.
    returnList = [];
  
  // get dateList and cleansing.
  dateList   = sheet.getRange(i, column_for_date_1st, postedNumber, 1).getValues();
  for (let j = 0; j < postedNumber; j++) {
    dateList_formated.push(Utilities.formatDate(dateList[j][0], 'JST', 'yyyyMMdd'));
  }

  // get permalinkList and cleansing.
  permalinkList   = sheet.getRange(i, column_for_permalink_1st, postedNumber, 1).getValues();
  for (let j = 0; j < postedNumber; j++) {
    permalinkList_formated.push(permalinkList[j][0]);
  }

  // get postedList.
  postedList = sheet.getRange(i, column_for_posted_1st, postedNumber, 1).getValues();

  // create returnList
  for (let k = 0; k < postedNumber; k++) {
    returnList.push([dateList_formated[k], postedList[k][0], permalinkList_formated[k]]);
  }

  return returnList;
}

function readYetReadArticles(postedList) {
  // declare for prepare.
  let funcName = arguments.callee.name;

  console.time('DEBUG: END ' + funcName + ' - getAlreadyPostedList');
  console.log('DEBUG: START ' + funcName + ' - getAlreadyPostedList.');
  var alreadyPostedList = getAlreadyPostedList(postedList);
  console.timeEnd('DEBUG: END ' + funcName + ' - getAlreadyPostedList');
  
  // declare for prepare.
  console.time('DEBUG: END ' + funcName + ' - getYetReadList');
  console.log('DEBUG: START ' + funcName + ' - getYetReadList.');
  var yetReadList = getYetReadList(alreadyPostedList);
  console.timeEnd('DEBUG: END ' + funcName + ' - getYetReadList');

  return yetReadList;
}

function exportYetReadArticles(yetReadArticlesList) {
  // declare.
  var targetUrl = 'https://www.endorphinbath.com/',
    getUrl,
    html,
    articleTitle,
    articleText,
    editFile,
    editFileId,
    docFile,
    body_docFile,
    docFileName,
    endOfText = '<p>以上になります！</p>\n      </div>',
    errorDocFile,
    body_errorDocFile,
    today = new Date();;

  // テンプレートファイル（「yyyyMMdd(E)」）
  var templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
  // 出力先フォルダ
  var outputFolder = DriveApp.getFolderById(DRAFT_FOLDER_ID);

  // 「ErrorLog_Batch」Docファイル
  errorDocFile = DocumentApp.openById(ERROR_LOG_DOC_ID);
  body_errorDocFile = errorDocFile.getBody();
  var paragraph = body_errorDocFile.appendParagraph(Utilities.formatDate(today, 'JST', 'yyyyMMdd') + '---ErrorLog---\n');

  // Read articles not read yet and which draft is nothing.
  yetReadArticlesList.some(function(value) {
    getUrl = targetUrl + value[1];
    html = UrlFetchApp.fetch(getUrl).getContentText('UTF-8');
    
    // Get articleTitle and cleansing.
    articleTitle = String(Parser.data(html).from('<h1 class="entry-title" itemprop="headline">').to('</h1>').iterate());
    articleTitle = articleTitle.replace(/\n          /g, '');
    articleTitle = articleTitle.replace(/        /g, '');

    // Get articleText and cleansing.
    articleText = String(Parser.data(html).from('<div class="entry-content cf" itemprop="mainEntityOfPage">').to(endOfText).iterate());
    articleText = articleText.replace(/p>\n\n\n\n<p>/g, 'p>\n<p>');

    // Check whether scraping is correctly.
    docFileName = value[0] + '_' + articleTitle;
    if (articleText.indexOf('<h2><span id="toc1">はじまり</span></h2>') != -1) {
      // Copy document with articleTitle.
      editFile = templateFile.makeCopy(docFileName, outputFolder);
      editFileId = editFile.getId();
      docFile = DocumentApp.openById(editFileId);
      body_docFile = docFile.getBody();

      // And write articleText.
      body_docFile.clear(); // 全消去
      var paragraph = body_docFile.appendParagraph(articleText);
      console.log(editFileId);
    }else{
      var paragraph = body_errorDocFile.appendParagraph(docFileName + '\n');
    }
  });
  var paragraph = body_errorDocFile.appendParagraph('\n\n');
}

function getYetReadList(alreadyPostedList) {
  // declare for prepare.
  var yetReadList = [];

  // declare for prepare.
  var folder_id = DRAFT_FOLDER_ID, // Folder ID of draft for article.
    folder,
    files,
    file_now,
    date_format_8 = "yyyyMMdd";

  // get list of folders.
  folder = DriveApp.getFolderById(folder_id);
  
  // get list of aticle not read yet.
  alreadyPostedList.forEach(function(value) {
    files = folder.getFiles();
    while(files.hasNext()) {
      file_now = files.next();
      // If draft of article exitsts, break while loop.
      if (value[0] == file_now.getName().substring(0, date_format_8.length)) {
        break;
      }
      
      // If draft of article is nothing, ...
      if (files.hasNext() == false) {
        // If Permalink is not null, ...
        if (value[1] != "") {
          // Push Article into list.
          yetReadList.push([value[0], value[1]]);
        }
      }
    }
  });

  return yetReadList;
}

function manageFilesGoogleDrive() {
  // record log.
  recordLog(arguments.callee.name);

  // declare for execute.
  var postedList;
  postedList = readGssColumns();
  moveFileToFolder(postedList);
}

function exportPostedArticles()  {
  let funcName = arguments.callee.name;
  // record log.
  recordLog(funcName);

  // declare for execute.
  var postedList;

  console.time('DEBUG: END ' + funcName + ' - readGssColumns');
  console.log('DEBUG: START ' + funcName + ' - readGssColumns.');
  postedList = readGssColumns();
  console.timeEnd('DEBUG: END ' + funcName + ' - readGssColumns');

  console.time('DEBUG: END ' + funcName + ' - readYetReadArticles');
  console.log('DEBUG: START ' + funcName + ' - readYetReadArticles.');
  yetReadArticlesList = readYetReadArticles(postedList);
  console.timeEnd('DEBUG: END ' + funcName + ' - readYetReadArticles');

  console.time('DEBUG: END ' + funcName + ' - exportYetReadArticles');
  console.log('DEBUG: START ' + funcName + ' - exportYetReadArticles.');
  exportYetReadArticles(yetReadArticlesList);
  console.timeEnd('DEBUG: END ' + funcName + ' - exportYetReadArticles');
}

function recordLog(argumentName) {
  var scriptId = ScriptApp.getScriptId();
  var passingJson = {
    'batchUrl': 'https://script.google.com/home/projects/' + scriptId,
    'methodName': argumentName
  }
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify(passingJson)
  };
  var response = UrlFetchApp.fetch(RECORD_EXEC_LOG_URL, options);
  console.log(response.getResponseCode());
}





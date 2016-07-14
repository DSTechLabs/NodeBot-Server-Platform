//=============================================================================
//
//     FILE : app.js
//
//  PROJECT : Sample NodeBot Client Application
//
//   AUTHOR : Bill Daniels
//            Copyright (c) 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Globals ---------------------------------------------

var WebSocket = undefined;

//--- Start up --------------------------------------------

$(document).ready (InitWebSocket);

//--- InitWebSocket ---------------------------------------

function InitWebSocket ()
{
  try
  {
    WebSocket = io ();  // Start Websocket API

    //---------------------------------
    //  Connect
    //---------------------------------
    WebSocket.on ('connect', function ()
    {
      $("#connectionStatus").html ('√ Connected to NodeBot Server');
      $("#connectionStatus").css ('color', '#FFFFFF');
      $("#connectionStatus").css ('background-color', '#008000');

      LogMessage ('Connected to NodeBot Server');
    });

    //---------------------------------
    //  Disconnect
    //---------------------------------
    WebSocket.on ('disconnect', function ()
    {
      $("#connectionStatus").html ('Not Connected to NodeBot Server');
      $("#connectionStatus").css ('color', '#E0E0E0');
      $("#connectionStatus").css ('background-color', '#800000');

      LogMessage ('Disconnected from NodeBot Server');
    });

    //---------------------------------
    //  NodeBot Server Messages
    //---------------------------------
    WebSocket.on ('message', function (serverMessage)
    {
      //// Strip any <CR><LF>
      //serverMessage = serverMessage.replaceAll ('\r', '').replaceAll ('\n', '');

      // Log and Process messages from the NodeBot Server:
      LogMessage (serverMessage);
      ProcessServerMessage (serverMessage);
    });
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- ProcessServerMessage --------------------------------

function ProcessServerMessage (serverMessage)
{
  // Process socket message from NodeBot Server
  try
  {
    if (serverMessage.contains ('|'))
    {
      var fields = serverMessage.split ('|');
      if (fields.length > 1)
      {
        //-------------------------------
        // Message from MCU firmware
        //-------------------------------
        if (fields[0][0] >= '0' && fields[0][0] <= '9')
        {
          // Process message from MCU board (firmware)
          var deviceID      = parseInt (fields[0]);
          var deviceMessage = fields[1];

          //  :
          //  : Process firmware message here
          //  :
        }

        //-------------------------------
        // FileList
        //-------------------------------
        else if (fields[0] == 'FileList')
        {
          var filenameArray = fields[1].split ('|');

          //  :
          //  : Process list of filenames here
          //  :
        }

        //-------------------------------
        // File
        //-------------------------------
        else if (fields[0] == 'File')
        {
          var fileLineArray = fields[1].split ('|');

          //  :
          //  : Process file contents here
          //  :
        }
      }
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- SendUserCommand -------------------------------------

function SendUserCommand ()
{
  // Send command to NodeBot Server
  try
  {
    var message = $("#userCommandBox").val();

    LogMessage (message);
    WebSocket.send (message);
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- LogMessage ------------------------------------------

function LogMessage (message)
{
  // Log message to monitor
  try
  {
    $("#messageList").append (message + '\n');
    $("#messageList").scrollTop (9e9);  // scroll to bottom
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- ShowException ---------------------------------------

function ShowException (ex)
{
  // Show exception details
  try
  {
    var msg = 'Exception:\n\n';

    if (ex != undefined)
    {
      if (ex.message == undefined)
        msg += ex;
      else
        msg += ex.message + '\n' + ex.filename + ' (line ' + ex.lineNumber + ')';
    }

    alert (msg);
  }
  catch (exSE)
  {
    console.log ('Exception in ShowException():\n' + exSE.message);
  }
}

//=============================================================================
//
//     FILE : NodeBotServer.js
//
//  PROJECT : HTTP and WebSocket Server for NodeBots
//
//  PURPOSE : This NodeJS module is both a Web Server and a WebSocket server.
//
//            █ NodeBot Server acts as a small Web Server and "serves"
//              the UI Web Application that controls any MCU based device,
//              such as a robot or CNC machine.  The web app it serves is
//              the specific device's user interface, e.g. Motion Controller.
//
//            █ NodeBot Server also acts as a WebSocket server.  It provides
//              bidirectional communication by websocket between the device's
//              user interface app and any number of MCU boards running
//              their firmware.  It communicates with the MCU boards by
//              individual serial port.
//
//            █ In Windows, to open more than the default number of
//              serial ports (4), you must increase the threadpool size
//              by setting the following environment variable:
//
//                UV_THREADPOOL_SIZE=32
//
//            █ This module is executed by running the NodeBot Server
//              from the NodeBot_Server folder:
//
//                > node NodeBotServer.js
//
//              NodeBotServer starts by reading the 'portConfigs.json' file
//              and opens all serial ports that are configured.
//
//              The format of the 'portConfigs.json' file is an array of
//              serial port settings (JSON objects).  For example:
//
//              [
//                {
//                  "deviceName"   : "Robot Motor 1",    - your own text name for the device
//                  "portName"     : "COM5",             - OS port name (COMn in Windows)
//                  "portSettings" : "57600|8|1|none",   - baud rate, data bits, stop bits, parity
//                  "serialPort"   : "undefined"         - leave as is, it is set and used by NodeBotServer
//                },
//                {
//                  "deviceName"   : "Robot Motor 2",
//                  "portName"     : "COM6",
//                  "portSettings" : "57600|8|1|none",
//                  "serialPort"   : "undefined"
//                },
//                :
//                :
//              ]
//
//              The newline character '\n' is used for serial message delimiting.
//
//            █ Folder Structure:
//
//                MyRobot                          - Parent folder of your NodeBot project
//                  │
//                  ├── NodeBot_Client             - Parent folder of your web app (NodeBot UI)
//                  │     │
//                  │     ├──                      - HTML Web App folders and files
//                  │     ├──                          :
//                  │     :                            :
//                  │
//                  └── NodeBot_Server             - Parent folder of the NodeBot Server
//                        │
//                        ├── NodeBotServer.js     - this file
//                        ├── package.json         - required for this module
//                        ├── portConfigs.json     - serial port configs for your MCU boards
//                        └── node_modules         - required node modules
//                              │                      :
//                              ├──                    :
//                              ├──
//                              :
//
//            █ Websocket messages to/from the client web application and the
//              MCU firmware boards.  The message begins with one or more digits
//              (Device ID) to indicate which board to communicate with.
//
//                id|message  - send <message> to device <id>
//
//              where <id> is a zero-based device id (one or more digits):
//
//                0 = first device (serial port) in 'portConfigs.json'
//                1 = second device
//                2 = third device
//                   :
//
//              Other messages from the client app to the NodeBot Server:
//
//                Broadcast|message      - Broadcast the firmware <message> to all devices
//                GetFileList|path       - Get a list of files in NodeBot_Client\<path>
//                GetFile|path           - Get the contents of the file at NodeBot_Client\<path>
//                PutFile|path|contents  - Put (write) <contents> to NodeBot_Client\<path>
//                                         (use '|' to delimit lines in <contents>)
//
//              Messages from the NodeBot Server to the client app:
//
//                id|message                  - Firmware <message> from device <id>
//                FileList|fname1|fname2|...  - List of files from GetFileList
//                File|contents               - Contents of file from GetFile
//                                              (separate lines in <contents> are
//                                               delimited with '|' char)
//
//            █ Architecture:
//
//              ┌────────────────────────────────────────────────┐
//              │NodeBot_Client                                  │
//              │                                                │
//              │         W E B   A P P L I C A T I O N          │
//              │           (NodeBot User Interface)             │
//              │                                                │
//              │        HTML5/CSS3/Javascript/jQuery/...        │
//              │                                                │
//              └────────╥─────────────────────╥─────────────────┘
//                       ║                     ║
//                       ║ HTTP                ║ Websocket
//                       ║ Pages               ║ Messages
//                       ║                     ║
//              ┌────────╨─────────────────────╨─────────────────┐
//              │NodeBot_Server                                  │
//              │                                                │
//              │          N O D E B O T   S E R V E R           ╞════════╗
//              │                                                │        ║
//              │    ∙ HTTP Server for Web App above             │ ┌──────╨──────┐
//              │      using Express                             │ │             │
//              │                                                │ │ portConfigs │
//              │    ∙ Websocket Server for Web App above        │ │    .json    │
//              │      using Socket.io                           │ │             │
//              │                                                │ │  loaded at  │
//              │    ∙ Serial Port Connections to multiple       │ │   startup   │
//              │      MCU Boards below using node-serialport    │ └─────────────┘
//              │                                                │
//              └──────╥────────────────╥────────────────╥───────┘
//                     ║                ╨                ║
//                     ║           Serial Port           ║
//                     ║          Communications         ║
//                     ║                ╥                ║
//              ┌──────╨───────┐ ┌──────╨───────┐ ┌──────╨───────┐ ┌────
//              │              │ │              │ │              │ │
//              │    M C U     │ │    M C U     │ │    M C U     │ │
//              │  B O A R D   │ │  B O A R D   │ │  B O A R D   │ │
//              │              │ │              │ │              │ │
//              │   Arduino    │ │   Arduino    │ │   Arduino    │ │∙∙∙
//              │ Beagleboard  │ │ Beagleboard  │ │ Beagleboard  │ │
//              │ Raspberry Pi │ │ Raspberry Pi │ │ Raspberry Pi │ │
//              │      :       │ │      :       │ │      :       │ │
//              │              │ │              │ │              │ │
//              └──────────────┘ └──────────────┘ └──────────────┘ └────
//
//   AUTHOR : Bill Daniels
//            Copyright (c) 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Globals -----------------------------------------------------------------

var   MCUPorts         = [];
var   CurrentPortIndex = 0;
var   FileSystem       = require ("fs");
var   WebSocket        = undefined;

//--- Startup -----------------------------------------------------------------

console.log ();
console.log ('▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀');
console.log ('      N O D E B O T   S E R V E R  (2016.07.14)');
console.log ();
console.log ('  Author: Bill Daniels');
console.log ('          Copyright 2014-2016, D+S Tech Labs, Inc.');
console.log ('          All Rights Reserved.');
console.log ();
console.log ('              Press [Ctrl-C] to exit');
console.log ('▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄');
console.log ();

// Catch the SIGINT interrupt [Ctrl-C] to close gracefully
process.on ('SIGINT', CloseSerialPorts);

// Load extra string functions
LoadStringExtras ();

// Initialize all configured serial ports
OpenSerialPorts ();


//-----------------------------------------------------------------------------
//  OpenSerialPorts
//-----------------------------------------------------------------------------

function OpenSerialPorts ()
{
  try
  {
    var Node_SerialPort = require ("serialport");
    var i, portSettings;

    // (Thanks to voodootikigod/node-serialport on github)

    // Load serial port configurations from [portConfigs.json]
    var portConfigs = FileSystem.readFileSync ('portConfigs.json');
    if (portConfigs == undefined)
      PostMessage ('Unable to load port configs:  Check [portConfigs.json] file.', false);
    else
    {
      // Load the MCUPorts array
      MCUPorts = JSON.parse (portConfigs.toString());
      var dataCallbacks = [MCUPorts.length];

      // Define the callback functions for incoming data from the firmware
      // This must be done using literal eval's since the loop index will not be valid at time of call
      // It must take the following form:
      //   dataCallbacks[0] = function (firmwareMessage) { PostMessage ('00|' + firmwareMessage, true); };
      for (i=0; i<MCUPorts.length; i++)
        eval ("dataCallbacks[" + i.toString() + "] = function (firmwareMessage) { PostMessage ('" + i.toString() + "|' + firmwareMessage, true); }");

      // Instantiate serial ports
      for (i=0; i<MCUPorts.length; i++)
      {
        portSettings = MCUPorts[i].portSettings.split ('|');
        MCUPorts[i].serialPort = new Node_SerialPort (MCUPorts[i].portName,
                                                     {
                                                       autoOpen : false,
                                                       baudRate : parseInt (portSettings[0]),
                                                       dataBits : parseInt (portSettings[1]),
                                                       stopBits : parseInt (portSettings[2]),
                                                       parity   : portSettings[3],
                                                       parser   : Node_SerialPort.parsers.readline('\n')
                                                     });
        MCUPorts[i].serialPort.on ('data', dataCallbacks[i]);
      }

      // Open the first serial port
      // Other ports will open recursively
      CurrentPortIndex = 0;
      OpenNextPort ();
    }
  }
  catch (ex)
  {
    ShowException (ex, WebSocket);
  }
}

//--- OpenNextPort ----------------------------------------

function OpenNextPort ()
{
  try
  {
    // All serial ports opened?
    if (CurrentPortIndex >= MCUPorts.length)
      return;

    MCUPorts[CurrentPortIndex].serialPort.open (function (error)
    {
      if (error)
        PostMessage ('Unable to open serial port ' + MCUPorts[CurrentPortIndex].portName + ' for ' + MCUPorts[CurrentPortIndex].deviceName, false);
      else
        PostMessage (MCUPorts[CurrentPortIndex].portName + ' opened for ' + MCUPorts[CurrentPortIndex].deviceName, false);

      // Recursively open the next serial port
      if (++CurrentPortIndex < MCUPorts.length)
        setTimeout (OpenNextPort, 100);  // delay between opening serial ports
      else
        // All serial ports are open ...
        // Initialize web server and web socket messaging
        InitServers (2016);
    });
  }
  catch (ex)
  {
    ShowException (ex, WebSocket);
  }
}

//--- CloseSerialPorts ------------------------------------

function CloseSerialPorts ()
{
  try
  {
    // Close all serial ports
    MCUPorts.forEach (function (device)
    {
      if (device.serialPort != undefined)
      {
        if (device.serialPort.isOpen ())
        {
          device.serialPort.close ();
          PostMessage (device.portName + ' closed', false);
        }
      }
    });
  }
  catch (ex)
  {
    ShowException (ex);
  }

  process.exit ();
}


//-----------------------------------------------------------------------------
//  InitServers
//-----------------------------------------------------------------------------

function InitServers (port)
{
  try
  {
    // Load required modules for web and socket servers
    var express   = require ('express');
    var botServer = express ();
    var http      = require ('http').Server (botServer);
    var io        = require ('socket.io')(http);

    // Set location of website files:
    //
    //  (your NodeBot project folder)
    //    │
    //    ├── NodeBot_Client (the Web App UI)
    //    └── NodeBot_Server (this module)
    //
    botServer.use (express.static ('../NodeBot_Client/'));

    // Socket event handling
    io.on ('connection', function (webSocket)
    {
      // Save global reference to websocket and indicate connection
      WebSocket = webSocket;

      // Process web app UI messages
      WebSocket.on ('message', ProcessClientMessage);
    });

    // Start the web server
    http.listen (port, function ()  // NOT botServer.listen () !!!
    {
      PostMessage ('NodeBot Server is listening on port [' + port.toString() + '] ... use Browser address http://localhost:' + port.toString(), false);
    });
  }
  catch (ex)
  {
    ShowException (ex, WebSocket);
  }
}


//-----------------------------------------------------------------------------
//  ProcessClientMessage
//-----------------------------------------------------------------------------

function ProcessClientMessage (clientMessage)
{
  try
  {
    // Echo client message to console
    PostMessage (clientMessage, false);

    // Check minimum requirements
    if (clientMessage.length < 3 || !clientMessage.contains ('|'))
      return;

    var fields = clientMessage.split ('|');
    if (fields.length < 2)
      PostMessage ('Bad command: ' + clientMessage, true);
    else
    {
      var command = fields[0];

      //-----------------------------------------
      // id|message
      //-----------------------------------------
      if (command[0] >= '0' && command[0] <= '9')
      {
        // Forward firmware message to appropriate port:
        var deviceID = parseInt (command);
        if (deviceID < 0 || deviceID >= MCUPorts.length)
          PostMessage ('Bad device ID: ' + deviceID.toString(), true);
        else
          MCUPorts[deviceID].serialPort.write (fields[1] + '\n');
      }

      //-----------------------------------------
      // Broadcast|message
      //-----------------------------------------
      else if (command == 'Broadcast')
      {
        // Broadcast message to all ports (e.g. E-STOP)
        MCUPorts.forEach (function (device)
        {
          device.serialPort.write (fields[1] + '\n');
        });
      }

      //-----------------------------------------
      // GetFileList|path
      // (relative to NodeBot_Client folder)
      //-----------------------------------------
      else if (command == 'GetFileList')
      {
        // Get a list of files under NodeBot_Client\path
        FileSystem.readdir ('..\\NodeBot_Client\\' + fields[1], function (error, files)
        {
          if (error)
            PostMessage ('Unable to get file list: ' + error.message, false);
          else
          {
            var fileListString = 'FileList|';

            // Send array of filenames as a '|' delimited string
            files.forEach (function (name)
            {
              fileListString += name + '|';
            });

            // Remove last delimiter if any
            if (fileListString.endsWith ('|'))
              fileListString = fileListString.slice (0, -1);

            PostMessage (fileListString, true);
          }
        });
      }

      //-----------------------------------------
      // GetFile|path
      // (relative to NodeBot_Client folder)
      //-----------------------------------------
      else if (command == 'GetFile')
      {
        // Get contents of file at NodeBot_Client\path
        FileSystem.readFile ('..\\NodeBot_Client\\' + fields[1], function (error, contents)
        {
          if (error)
            PostMessage ('Error reading file: ' + error.message, true);
          else
          {
            var fileData = contents.toString();
            PostMessage ('File|' + fileData, true);
          }
        });
      }

      //-----------------------------------------
      // PutFile|path|contents
      // (relative to NodeBot_Client folder)
      //-----------------------------------------
      else if (command == 'PutFile')
      {
        // Write contents to file at NodeBot_Client\path
        FileSystem.writeFile ('..\\NodeBot_Client\\' + fields[1], fields[2], function (error)
        {
          if (error)
            PostMessage ('Error writing file: ' + error.message);
        });
      }

      //-----------------------------------------
      // Unknown command
      //-----------------------------------------
      else
        PostMessage ('Bad command: ' + clientMessage, true);
    }
  }
  catch (ex)
  {
    ShowException (ex, WebSocket);
  }
}


//-----------------------------------------------------------------------------
//  PostMessage
//-----------------------------------------------------------------------------

function PostMessage (message, sendToClient)
{
  try
  {
    // Send message to client app by WebSocket, if specified
    if (sendToClient && (WebSocket != undefined))
      WebSocket.send (message);

    // Echo message to console
    console.log (GetTimestamp() + ': ' + message);
  }
  catch (ex)
  {
    console.log (ex.message);
  }
}


//=============================================================================
//  Utility Functions
//=============================================================================

function LoadStringExtras ()
{
  //---------------------------------------------------------
  //  String Functions
  //---------------------------------------------------------

  if (typeof String.prototype.startsWith != 'function')
  {
    String.prototype.startsWith = function (string)
    {
      return this.slice (0, string.length) == string;
    };
  }

  if (typeof String.prototype.endsWith != 'function')
  {
    String.prototype.endsWith = function (string)
    {
      return this.slice (-string.length) == string;
    };
  }

  if (typeof String.prototype.padLeft != 'function')
  {
    String.prototype.padLeft = function (padChar, totalLength)
    {
      var paddedString = this;

      while (paddedString.length < totalLength)
        paddedString = padChar + paddedString;

      return paddedString;
    };
  }

  if (typeof String.prototype.padRight != 'function')
  {
    String.prototype.padRight = function (padChar, totalLength)
    {
      var paddedString = this;

      while (paddedString.length < totalLength)
        paddedString += padChar;

      return paddedString;
    };
  }

  if (typeof String.prototype.replaceAll != 'function')
  {
    String.prototype.replaceAll = function (search, replace)
    {
      if (replace === undefined)
        return this.toString();

      return this.split (search).join (replace);
    }
  }

  if (typeof String.prototype.contains != 'function')
  {
    String.prototype.contains = function (search)
    {
      return (this.indexOf (search) >= 0);
    }
  }
}

//--- GetTimestamp ----------------------------------------

function GetTimestamp ()
{
  var timestamp = '';

  try
  {
    var newDate = new Date ();

    // Return a current timestamp
    timestamp = newDate.getHours        ().toString().padLeft  ('0', 2) + ':' +
                newDate.getMinutes      ().toString().padLeft  ('0', 2) + ':' +
                newDate.getSeconds      ().toString().padLeft  ('0', 2) + '.' +
                newDate.getMilliseconds ().toString().padRight ('0', 3);
  }
  catch (ex)
  {
    ShowException (ex);
  }

  return timestamp;
}

//---------------------------------------------------------
//  Exception Handling
//---------------------------------------------------------

function ShowException (ex)
{
  // Show exception details
  try
  {
    var msg = '███ Exception ███ ';

    if (ex != undefined)
    {
      if (ex.message == undefined)
        msg += ex;
      else
        msg += ex.message + '\n' + ex.filename + ' (line ' + ex.lineNumber + ')';
    }

    console.log ('\n' + msg + '\n');
  }
  catch (exSE)
  {
    console.log ('Exception in ShowException():\n' + exSE.message);
  }
}

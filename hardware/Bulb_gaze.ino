// Gaze IoT controller for Arduino MKR1010(c) 2021 Jordi Solsona

#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include <Regexp.h>

#if ( defined(ARDUINO_SAM_DUE) || defined(__SAM3X8E__) )
// Default pin 10 to SS/CS
#define USE_THIS_SS_PIN       10
#define BOARD_TYPE      "SAM DUE"
#elif ( defined(CORE_TEENSY) )
#error You have to use examples written for Teensy
#endif

#define _WEBSOCKETS_LOGLEVEL_     3
#define WEBSOCKETS_NETWORK_TYPE   NETWORK_WIFININA

//#include <WiFiNINA_Generic.h>

#include <ArduinoJson.h>

#include <WebSocketsClient_Generic.h>
#include <SocketIOclient_Generic.h>

SocketIOclient socketIO;

int status = WL_IDLE_STATUS;

byte mac[6];

// Select the IP address according to your local network
IPAddress clientIP(10,204,0,121);


#include "arduino_secrets.h"

#define flag_body 0
#define flag_hand 0
#define flag_face 1
#define flag_face_deg 1
#define flag_age 0
#define flag_gend 0
#define flag_gaze 1
#define flag_blink 0
#define flag_expression 0
#define flag_ID 0
#define flag_image 0
#define HVC_SYNCBYTE 0xFE
#define HVC_SET_FACE 0x09
#define HVC_SET_FACE_THERSHOLD 0x05
#define HVC_READ_DATA 0x04
#define HVC_MESG_SIZE 2
#define HVC_DATA 0x00
#define HVC_PROTOCOL 1
#define HVC_FACE_POS 8
#define HVC_HAND_POS 7
#define HVC_BODY_POS 6
#define FILTER_MODE 0
#define HVC_NUM 2


byte msgInBuf[162];
byte msgInPos = 0;
uint32_t msgSize = 0;
byte msgSizeBytes[4];
bool msgStarted = false;
bool new_message = false;
bool cam_initialized = false;
int num_faces;

byte read1 = flag_body + 2 * flag_hand + 4 * flag_face + 8 * flag_face_deg + 16 * flag_age + 32 * flag_gend + 64 * flag_gaze + 128 * flag_blink;
byte read2 = flag_expression + 2 * flag_ID;
byte com_setface[] = {0xFE, 0x09, 0x02, 0x00, 0x00, 0x00};
byte com_setTH[] = {0xFE, 0x05, 0x08, 0x00, 0xF4, 0x01, 0xF4, 0x01, 0xF4, 0x01, 0xF4, 0x01};//set face detection threshold 500
byte com_read[] = {0xFE, 0x04, 0x03, 0x00, read1, read2, flag_image}; //command to read data from HVC-P2

struct FACE {//structure for detected face
  int pos[4];
  int deg[4];
  int age[2];
  char gender[2];
  int gaze[2];
  int blink_eyes[2];
  int expression[6];
  byte face_d[8];
  int face_deg_d[8];
  byte face_age_d[3];
  byte face_gend_d[3];
  signed char face_gaze_d[2];
  byte face_blink_d[4];
  byte face_expression_d[6];
  signed char face_ID_d[4];
};
const int reset = 8;     // the number of the pushbutton pin//BOX NUMBER 2 HAS reset 8 and BULB 7, the rest is the otherway around

const int bulb = 7;     // the number of the pushbutton pin
unsigned long timeout;

FACE face[8];//face structure array

// Which pin on the Arduino is connected to the NeoPixels?
#define PIN        6

// How many NeoPixels are attached to the Arduino?
#define NUMPIXELS 12 // Popular NeoPixel ring size

Adafruit_NeoPixel pixels(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

#define DELAYVAL 20 // Time (in milliseconds) to pause between pixels

void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length)
{
  switch (type)
  {
    case sIOtype_DISCONNECT:
      Serial.println("[IOc] Disconnected");
      break;
    case sIOtype_CONNECT:

      Serial.print("[IOc] Connected to url: ");
      Serial.println((char*) payload);

      // join default namespace (no auto join in Socket.IO V3)
      socketIO.send(sIOtype_CONNECT, "/camera-2");

      break;
    case sIOtype_EVENT:
      {

        Serial.print("[IOc] Get event: ");
        Serial.println((char*) payload);

        String aux_payload = (char*) payload;

        aux_payload = charTrim((char*) payload, '\\');
        aux_payload = aux_payload.substring(aux_payload.indexOf('{'), aux_payload.length() - 1);

        StaticJsonDocument<800> command_json;

        // Deserialize the JSON document
        DeserializationError error = deserializeJson(command_json, aux_payload);


        // Test if parsing succeeds.
        if (error) {
          Serial.print(F("deserializeJson() failed: "));
          Serial.println(error.f_str());
          return;
        } else {

          //println(command_json["command"]);
          String aux_s = command_json["command"];
          if (aux_s == "ring") {
            Serial.println("-> Ring data received");
            for (int i = 0; i < NUMPIXELS; i++) { // For each pixel...
              String r_string = command_json[String(i) + "r"];
              int r = r_string.toInt();
              String g_string = command_json[String(i) + "g"];
              int g = g_string.toInt();
              String b_string = command_json[String(i) + "b"];
              int b = b_string.toInt();
              pixels.setPixelColor(i, pixels.Color(r, g, b));
            }
            pixels.show();   // Send the updated pixel colors to the hardware.
          } else if (aux_s == "status") {
            String status = command_json["status"];
            if (status == "true") {
              digitalWrite(bulb, HIGH);
            } else {
              digitalWrite(bulb, LOW);
            }
          }
        }
      }
      break;
    case sIOtype_ACK:
      Serial.print("[IOc] Get ack: ");
      Serial.println(length);

      //hexdump(payload, length);
      break;
    case sIOtype_ERROR:
      Serial.print("[IOc] Get error: ");
      Serial.println(length);

      //hexdump(payload, length);
      break;
    case sIOtype_BINARY_EVENT:
      Serial.print("[IOc] Get binary: ");
      Serial.println(length);

      //hexdump(payload, length);
      break;
    case sIOtype_BINARY_ACK:
      Serial.print("[IOc] Get binary ack: ");
      Serial.println(length);

      //hexdump(payload, length);
      break;

    default:
      break;
  }
}


void setup() {
  pinMode(reset, OUTPUT);
  pinMode(bulb, OUTPUT);

  //pinMode(pin, INPUT);           // set pin to input
  //digitalWrite(pin, HIGH);       // turn on pullup resistors

  digitalWrite(reset, LOW);
  digitalWrite(bulb, HIGH);
  delay(100);
  digitalWrite(reset, HIGH);
  digitalWrite(bulb, LOW);
  delay(2000);

  //Initialize serial and wait for port to open:
  Serial.begin(57600);
  //while (!Serial);

  Serial1.begin(9600);
  Serial.println("Initialising Arduino");
  pixels.clear();
  pixels.begin(); // INITIALIZE NeoPixel strip object (REQUIRED)
  for (int i = 0; i < NUMPIXELS; i++) { // For each pixel...
    pixels.setPixelColor(i, pixels.Color(50, 0, 0)); //down
  }
  pixels.show();   // Send the updated pixel colors to the hardware.

  Serial.print("\nStart WebSocketClientSocketIO_NINA on ");
  Serial.println(WEBSOCKETS_GENERIC_VERSION);

  Serial.println("Used/default SPI pinout:");
  Serial.print("MOSI:");
  Serial.println(MOSI);
  Serial.print("MISO:");
  Serial.println(MISO);
  Serial.print("SCK:");
  Serial.println(SCK);
  Serial.print("SS:");
  Serial.println(SS);

  // check for the WiFi module:
  if (WiFi.status() == WL_NO_MODULE)
  {
    Serial.println("Communication with WiFi module failed!");
    // don't continue
    while (true);
  }
  for (int i = 0; i < NUMPIXELS; i++) { // For each pixel...
    pixels.setPixelColor(i, pixels.Color(0, 50, 0)); //down
  }
  pixels.show();   // Send the updated pixel colors to the hardware.
  Serial.println("Communication with WiFi module succeded!");

  WiFi.macAddress(mac);
  Serial.print("MAC: ");
  Serial.print(mac[5], HEX);
  Serial.print(":");
  Serial.print(mac[4], HEX);
  Serial.print(":");
  Serial.print(mac[3], HEX);
  Serial.print(":");
  Serial.print(mac[2], HEX);
  Serial.print(":");
  Serial.print(mac[1], HEX);
  Serial.print(":");
  Serial.println(mac[0], HEX);

  String fv = WiFi.firmwareVersion();
  if (fv < WIFI_FIRMWARE_LATEST_VERSION)
  {
    Serial.println("Please upgrade the firmware");
  }
  Serial.println("Correct firmware");

  // attempt to connect to Wifi network:
  while (status != WL_CONNECTED)
  {
    Serial.print("Attempting to connect to SSID: ");
    Serial.println(SECRET_SSID);
    // Connect to WPA/WPA2 network. Change this line if using open or WEP network:
    status = WiFi.begin(SECRET_SSID, SECRET_PASS);

    // wait 10 seconds for connection:
    delay(2000);
  }

  printWifiStatus();

  for (int i = 0; i < NUMPIXELS; i++) { // For each pixel...

    // pixels.Color() takes RGB values, from 0,0,0 up to 255,255,255
    // Here we're using a moderately bright green color:
    pixels.setPixelColor(i, pixels.Color(0, 50, 0));
  }
  pixels.show();   // Send the updated pixel colors to the hardware.
  delay(500);

  IPAddress result;
  Serial.println(WiFi.hostByName(WS_SERVER_IP, result));
  Serial.print("XXXXXXXXXXXXXX IP address: ");
  Serial.println(result);

  // server address, port and URL
  Serial.print("Connecting to WebSockets Server @ IP address: ");
  Serial.print(WS_SERVER_IP);
  Serial.print(", port: ");
  Serial.println(WS_SERVER_PORT);

  // setReconnectInterval to 10s, new from v2.5.1 to avoid flooding server. Default is 0.5s
  socketIO.setReconnectInterval(2000);

  socketIO.setExtraHeaders("Authorization: 1234567890");

  // server address, port and URL
  void begin(IPAddress host, uint16_t port, String url = "/socket.io/?EIO=4", String protocol = "arduino");
  // To use default EIO=4 from v2.5.1
  socketIO.begin(WS_SERVER_IP, WS_SERVER_PORT);

  // event handler
  socketIO.onEvent(socketIOEvent);
  for (int i = 0; i < NUMPIXELS; i++) { // For each pixel...
    pixels.setPixelColor(i, pixels.Color(0, 0, 50)); //down
  }
  pixels.show();   // Send the updated pixel colors to the hardware.
  delay(500);
  pixels.clear();
  pixels.show();   // Send the updated pixel colors to the hardware.
  timeout = millis();
}

void loop() {
  socketIO.loop();
  unsigned long stamp = millis();

  if ((cam_initialized == false) || (millis() - timeout > 1500)) {
    if (millis() - timeout > 1500) {
      Serial.println("-------------------------------------");
      Serial.println("TIMEOUT!");
      Serial.println("-------------------------------------");
    }
    Serial.println("-------------------------------------");
    Serial.println("Initialising OMRON HVC camera module: ");
    Serial.println("-------------------------------------");
    Serial1.write(com_setface, sizeof(com_setface));
    Serial1.write(com_setTH, sizeof(com_setTH));
    Serial1.write(com_read, sizeof(com_read));
    cam_initialized = true;
    timeout = millis();
  }
  while (Serial1.available())
  {
    update();
  }
  if (new_message) {
    socketIO.loop();
    new_message = false;
    timeout = millis();
    Serial1.write(com_read, sizeof(com_read));
    if (num_faces <= 0) {
      Serial.print("-NF");
    } else {
      for (int i = 0; i < num_faces; i++) {
        Serial.print("F:");
        Serial.print(i);
        Serial.print(": ");
        Serial.print(face[i].pos[0]);
        Serial.print(":");
        Serial.print(face[i].pos[1]);
        Serial.print(":FD: ");
        Serial.print(face[i].deg[0]);
        Serial.print(":");
        Serial.print(face[i].deg[1]);
        Serial.print(":");
        Serial.print(":G: ");
        Serial.print(face[i].gaze[0]);
        Serial.print(":");
        Serial.print(face[i].gaze[1]);
        Serial.println(":.");
      }
      StaticJsonDocument<1000> doc;
      JsonArray faces_ = doc.createNestedArray("face");

      for (int i = 0; i < num_faces; i++) {
        StaticJsonDocument<100> face_features;
        StaticJsonDocument<100> direction_features;
        StaticJsonDocument<100> gaze_features;
        StaticJsonDocument<800> aux_face;

        face_features["x"] = 1;
        face_features["y"] = 2;
        face_features["size"] = 3;
        face_features["confidence"] = 4;

        direction_features["yaw"] = face[i].deg[0];
        direction_features["pitch"] = face[i].deg[1];
        direction_features["roll"] = face[i].deg[2];
        direction_features["confidence"] = face[i].deg[3];

        gaze_features["yaw"] = face[i].gaze[0];
        gaze_features["pitch"] = face[i].gaze[1];

        aux_face["face"] = face_features;
        aux_face["direction"] = direction_features;
        aux_face["gaze"] = gaze_features;

        faces_.add(aux_face);
      }

      // JSON to String (serializion)
      String output;

      serializeJson(doc, output);

      // Send event
      //socketIO.sendEVENT(output);

      output.replace("\"", "\\\"");


      String msg = String("/camera-2,[\"");
      msg += "face";
      msg += "\"";
      if (output) {
        msg += ",\"";
        //msg += "{\\\"command\\\":\\\"calibrate\\\"}";
        msg += output;
      }
      msg += "\"]";
      socketIO.sendEVENT(msg);


      socketIO.loop();

      /*Serial.print("-> ");
      Serial.print(millis());
      Serial.println(" <-");
      Serial.println(msg);*/
    }
  }
}

void printWifiStatus()
{
  // print the SSID of the network you're attached to:
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  // print your board's IP address:
  IPAddress ip = WiFi.localIP();
  Serial.print("WebSockets Client IP Address: ");
  Serial.println(ip);

  // print the received signal strength:
  long rssi = WiFi.RSSI();
  Serial.print("signal strength (RSSI):");
  Serial.print(rssi);
  Serial.println(" dBm");
}

char* charTrim(char* stringToTrim, char charsToTrim) {
  String output;
  String toTrim = String(stringToTrim);
  for (int i = 0; i < toTrim.length(); i++) {
    if (i == 0) continue; //skip the first char '"'
    if (toTrim.charAt(i) != charsToTrim) {
      output += toTrim.charAt(i);
    }
  }
  //Serial << "before const_cast return: " << output << endl;    //<<---------------
  return const_cast<char*>(output.c_str());
}

void update()
{
  byte t = Serial1.read();

  if (msgInPos > 162) {
    msgStarted = false;
    msgInPos = 0;
    msgSize = 0;
  }
  if (!msgStarted && (t == HVC_SYNCBYTE)) {
    msgStarted = true;
  }
  if (msgStarted) {
    msgInBuf[msgInPos] = t;
    if (msgInPos == HVC_MESG_SIZE) {
      msgSizeBytes[0] = t;
    } else if (msgInPos == HVC_MESG_SIZE + 1) {
      msgSizeBytes[1] = t;
    } else if (msgInPos == HVC_MESG_SIZE + 2) {
      msgSizeBytes[2] = t;
    } else if (msgInPos == HVC_MESG_SIZE + 3) {
      msgSizeBytes[3] = t;
      msgSize = (uint32_t) msgSizeBytes[3] << 24;
      msgSize |=  (uint32_t) msgSizeBytes[2] << 16;
      msgSize |= (uint32_t) msgSizeBytes[1] << 8;
      msgSize |= (uint32_t) msgSizeBytes[0];
      msgSize = msgSize + 6;
    }
    msgInPos++;
    if (msgInPos == msgSize) {
      switch (msgInBuf[HVC_PROTOCOL]) {
        case HVC_DATA: {
            num_faces = msgInBuf[HVC_FACE_POS];
            if (flag_face && msgInBuf[HVC_FACE_POS] > 0) {//face detection
              int message_pos = HVC_FACE_POS + 2;
              for (int z = 0; z < msgInBuf[HVC_FACE_POS]; z++) {
                if (flag_face) {
                  for (int j = 0; j < 8; j++) {
                    face[z].face_d[j] = msgInBuf[message_pos];
                    message_pos++;
                    face[z].pos[0] = (int)face[z].face_d[0] + 256 * (int)face[z].face_d[1];
                    face[z].pos[1] = (int)face[z].face_d[2] + 256 * (int)face[z].face_d[3];
                    face[z].pos[3] = (int)face[z].face_d[4] + 256 * (int)face[z].face_d[5];
                    face[z].pos[4] = (int)face[z].face_d[6] + 256 * (int)face[z].face_d[7];
                  }
                }
                if (flag_face_deg) {
                  for (int j = 0; j < 8; j++) {
                    face[z].face_deg_d[j] = msgInBuf[message_pos];
                    message_pos++;
                    //face[z].deg[0] = (int)face[z].face_deg_d[0] + 256 * (int)face[z].face_deg_d[1];
                    face[z].deg[0] = (int)face[z].face_deg_d[0];
                    //face[z].deg[1] = (int)face[z].face_deg_d[2] + 256 * (int)face[z].face_deg_d[3];
                    face[z].deg[1] = (int)face[z].face_deg_d[1];
                    face[z].deg[2] = (int)face[z].face_deg_d[4] + 256 * (int)face[z].face_deg_d[5];
                    face[z].deg[3] = (int)face[z].face_deg_d[6] + 256 * (int)face[z].face_deg_d[7];
                  }
                }
                if (flag_age) {
                  for (int j = 0; j < 3; j++) {
                    face[z].face_age_d[j] = msgInBuf[message_pos];
                    message_pos++;
                    face[z].age[0] = (int)face[z].face_age_d[0] + 256 * (int)face[z].face_age_d[1];
                    face[z].age[1] = (int)face[z].face_age_d[2] + 256 * (int)face[z].face_age_d[3];
                  }
                }
                if (flag_gend) {
                  for (int j = 0; j < 3; j++) {
                    face[z].face_gend_d[j] = msgInBuf[message_pos];
                    message_pos++;
                    face[z].gender[0] = (int)face[z].face_gend_d[0] + 256 * (int)face[z].face_gend_d[1];
                    face[z].gender[1] = (int)face[z].face_gend_d[2] + 256 * (int)face[z].face_gend_d[3];
                  }
                }
                if (flag_gaze) {
                  for (int j = 0; j < 2; j++) {
                    face[z].face_gaze_d[j] = msgInBuf[message_pos];
                    message_pos++;
                    face[z].gaze[0] = (int)face[z].face_gaze_d[0];
                    face[z].gaze[1] = (int)face[z].face_gaze_d[1];
                  }
                }
                if (flag_blink) {
                  for (int j = 0; j < 4; j++) {
                    face[z].face_blink_d[j] = msgInBuf[message_pos];
                    message_pos++;
                    face[z].blink_eyes[0] = (int)face[z].face_blink_d[0] + 256 * (int)face[z].face_blink_d[1];
                    face[z].blink_eyes[1] = (int)face[z].face_blink_d[2] + 256 * (int)face[z].face_blink_d[3];
                  }
                }
                if (flag_expression) {
                  for (int j = 0; j < 6; j++) {
                    face[z].face_expression_d[j] = msgInBuf[message_pos];
                    message_pos++;
                    face[z].expression[0] = (int)face[z].face_expression_d[0];
                    face[z].expression[1] = (int)face[z].face_expression_d[1];
                    face[z].expression[2] = (int)face[z].face_expression_d[2];
                    face[z].expression[3] = (int)face[z].face_expression_d[3];
                    face[z].expression[4] = (int)face[z].face_expression_d[4];
                    face[z].expression[5] = (int)face[z].face_expression_d[5];
                  }
                }
                if (flag_ID) {
                  for (int j = 0; j < 4; j++) {
                    face[z].face_ID_d[j] = msgInBuf[message_pos];
                    message_pos++;

                  }
                }
              }

            }
            break;
          }
        default: {
            //////unknownResponseCallback(message,messageSize);
          }
      }
      msgStarted = 0;
      msgInPos = 0;
      msgSize = 0;
      new_message = true;
    }
  }
}

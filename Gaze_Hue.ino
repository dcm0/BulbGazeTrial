// Gaze IoT controller for Arduino MKR1010(c) 2021 Jordi Solsona

#include <Adafruit_NeoPixel.h>
#include <WiFiNINA.h>

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
  byte face_deg_d[8];
  byte face_age_d[3];
  byte face_gend_d[3];
  signed char face_gaze_d[2];
  byte face_blink_d[4];
  byte face_expression_d[6];
  signed char face_ID_d[4];
};

FACE face[8];//face structure array

char ssid[] = SECRET_SSID;        // your network SSID (name)
char pass[] = SECRET_PASS;    // your network password (use for WPA, or use as key for WEP)
int status = WL_IDLE_STATUS;     // the Wifi radio's status


// Which pin on the Arduino is connected to the NeoPixels?
#define PIN        6

// How many NeoPixels are attached to the Arduino?
#define NUMPIXELS 4 // Popular NeoPixel ring size

Adafruit_NeoPixel pixels(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

#define DELAYVAL 20 // Time (in milliseconds) to pause between pixels

void setup() {
  Serial1.begin(9600);
  while (true){
  pixels.begin(); // INITIALIZE NeoPixel strip object (REQUIRED)
  pixels.clear();
  pixels.setPixelColor(0, pixels.Color(20,0,0)); //down
  pixels.setPixelColor(1, pixels.Color(0,20,0)); //left
  pixels.setPixelColor(2, pixels.Color(0,0,20)); //top
  pixels.setPixelColor(3, pixels.Color(20,20,20)); //right
  pixels.show();   // Send the updated pixel colors to the hardware.
  delay(250);
  pixels.clear();
  pixels.setPixelColor(1, pixels.Color(50, 50, 50));
  pixels.show();   // Send the updated pixel colors to the hardware.
  delay(250);
  pixels.clear();
  pixels.setPixelColor(2, pixels.Color(50, 50, 50));
  pixels.show();   // Send the updated pixel colors to the hardware.
  delay(250);
  pixels.clear();
  pixels.setPixelColor(3, pixels.Color(50, 50, 50));
  pixels.show();   // Send the updated pixel colors to the hardware.
  delay(250);
  pixels.clear();
  pixels.show();
  }

  //Initialize serial and wait for port to open:
  Serial.begin(9600);

  // attempt to connect to Wifi network:
  while (status != WL_CONNECTED) {
    // Connect to WPA/WPA2 network:
    status = WiFi.begin(ssid, pass);

    // wait 10 seconds for connection:
    delay(1000);
  }

  for (int i = 0; i < NUMPIXELS; i++) { // For each pixel...

    // pixels.Color() takes RGB values, from 0,0,0 up to 255,255,255
    // Here we're using a moderately bright green color:
    pixels.setPixelColor(i, pixels.Color(0, 100, 0));

    pixels.show();   // Send the updated pixel colors to the hardware.
  }
  delay(200);
}

void loop() {
  if (cam_initialized == false) {
    Serial.println("Initialising OMRON HVC camera module: ");
    Serial1.write(com_setface, sizeof(com_setface));
    Serial1.write(com_setTH, sizeof(com_setTH));
    Serial1.write(com_read, sizeof(com_read));
    cam_initialized = true;
  }
  while (Serial1.available())
  {
    update();
  }
  if (new_message) {

    new_message = false;
    Serial1.write(com_read, sizeof(com_read));
    pixels.clear();
    if (num_faces <= 0) {
      for (int i = 0; i < NUMPIXELS; i++) { // For each pixel...
        //pixels.setPixelColor(i, pixels.Color(0, 0, 30));
        Serial.print(".");
      }
    } else {
//      if (face[0].gaze[1] > 15) {
//        pixels.setPixelColor(0, pixels.Color(0, 50, 0));
//        pixels.setPixelColor(2, pixels.Color(0, 0, 0));
//      } else if (face[0].gaze[1] < 15) {
//        pixels.setPixelColor(0, pixels.Color(0, 0, 0));
//        pixels.setPixelColor(2, pixels.Color(0, 50, 0));
//      } else {
//        pixels.setPixelColor(0, pixels.Color(0, 0, 0));
//        pixels.setPixelColor(2, pixels.Color(0, 0, 0));
//      }

      if (face[0].gaze[0] > 10) {
        pixels.setPixelColor(1, pixels.Color(0, 50, 0));
        pixels.setPixelColor(3, pixels.Color(0, 0, 0));
      } else if (face[0].gaze[0] < 10) {
        pixels.setPixelColor(1, pixels.Color(0, 0, 0));
        pixels.setPixelColor(3, pixels.Color(0, 50, 0));
      } else {
        pixels.setPixelColor(1, pixels.Color(0, 0, 0));
        pixels.setPixelColor(3, pixels.Color(0, 0, 0));
      }
    }
    pixels.show();
    for (int i = 0; i < num_faces; i++) {
      Serial.print("F:");
      Serial.print(i);
      Serial.print(": ");
      Serial.print(face[i].pos[0]);
      Serial.print(":");
      Serial.print(face[i].pos[1]);
      Serial.print(":G: ");
      Serial.print(face[i].gaze[0]);
      Serial.print(":");
      Serial.print(face[i].gaze[1]);
      Serial.println(":.");
    }
  }
}

void printData() {
  Serial.println("Board Information:");
  // print your board's IP address:
  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  Serial.println(ip);

  Serial.println();
  Serial.println("Network Information:");
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  // print the received signal strength:
  long rssi = WiFi.RSSI();
  Serial.print("signal strength (RSSI):");
  Serial.println(rssi);

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
                    face[z].deg[0] = (int)face[z].face_deg_d[0] + 256 * (int)face[z].face_deg_d[1];
                    face[z].deg[1] = (int)face[z].face_deg_d[2] + 256 * (int)face[z].face_deg_d[3];
                    face[z].deg[3] = (int)face[z].face_deg_d[4] + 256 * (int)face[z].face_deg_d[5];
                    face[z].deg[4] = (int)face[z].face_deg_d[6] + 256 * (int)face[z].face_deg_d[7];
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

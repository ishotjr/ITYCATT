var matrix = require('@matrix-io/matrix-lite');
var mqtt = require('mqtt');

var hostname = "mqtt://localhost"; //"mqtt://raspberrypi.local";
var client  = mqtt.connect(hostname);

console.log("[Snips Log] begin");

console.log("This device has " + matrix.led.length + ' LEDs');
var imu, uv, humidity, pressure;
imu = matrix.imu.read();
uv = matrix.uv.read();
humidity = matrix.humidity.read();
pressure = matrix.pressure.read();  
console.log(imu);
console.log(uv);
console.log(humidity);
console.log(pressure);

client.on('connect', function () {
    console.log("[Snips Log] Connected to MQTT broker " + hostname);

    // greet user on connection
    client.publish('hermes/dialogueManager/startSession', JSON.stringify({
        init: {
            type: "notification",
            text: "Good morning! My name is ITTY-CAT!" // (sic)
        }
    }));

    // subscribe to wildcard topic vs. individual intents!
    client.subscribe('hermes/#');
});

client.on('message', function (topic, message) {
    if (topic === "hermes/asr/startListening") {
        onListeningStateChanged(true);
    } else if (topic === "hermes/asr/stopListening") {
        onListeningStateChanged(false);
    } else if (topic.match(/hermes\/hotword\/.+\/detected/g) !== null) {
        onHotwordDetected()
    } else if (topic.match(/hermes\/intent\/.+/g) !== null) {
        onIntentDetected(JSON.parse(message));
    }
});

function onIntentDetected(intent) {
    console.log("[Snips Log] Intent detected: " + JSON.stringify(intent));

    // TODO: check intent

    if (typeof intent.slots[0] === 'undefined') {
        matrix.led.set("red");

        client.publish('hermes/dialogueManager/endSession', JSON.stringify({
            sessionId: intent.sessionId,
            text: "I'm afraid I didn't catch that?"
        }));
    } else {
        name = intent.slots[0].value.value;

        console.log("[Snips Log] name: " + name);

        client.publish('hermes/dialogueManager/endSession', JSON.stringify({
            sessionId: intent.sessionId,
            text: "hello" + name
        }));

        matrix.led.set("blue");
    }
}

function onHotwordDetected() {
    console.log("[Snips Log] Hotword detected");
    matrix.led.set("teal");
}

function onListeningStateChanged(listening) {
    console.log("[Snips Log] " + (listening ? "Start" : "Stop") + " listening");
    if (listening) {
        matrix.led.set("green");
    } else {
        matrix.led.set("black");
    }
}

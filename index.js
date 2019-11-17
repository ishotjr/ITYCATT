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
            // TODO: dynamic time of day
            text: "Good morning! My name is ITTY-CAT!" // (sic)
        }
    }));

    // subscribe to wildcard topic vs. individual intents!
    client.subscribe('hermes/#');

    // request user name
    client.publish('hermes/dialogueManager/startSession', JSON.stringify({
        init: {
            type: "action",
            text: "What is your name?",
            canBeEnqueued: true
            // TODO: intentFilter
        }
    }));
});

client.on('message', function (topic, message) {
    if (topic === "hermes/asr/startListening") {
        onListeningStateChanged(true);
    } else if (topic === "hermes/asr/stopListening") {
        onListeningStateChanged(false);
    } else if (topic.match(/hermes\/hotword\/.+\/detected/g) !== null) {
        onHotwordDetected()
    } else if (topic.match(/hermes\/intent\/.+/g) !== null) {
        onIntentDetected(topic, JSON.parse(message));
    }
});

function onIntentDetected(topic, message) {
    console.log("[Snips Log] Intent detected: " + JSON.stringify(message));

    // handle each intent
    console.log("[Snips Log] topic: " + topic);
    
    switch(topic) {
        case "hermes/intent/ishotjr:Welcome":
            if (typeof message.slots[0] === 'undefined') {
                matrix.led.set("red");
        
                client.publish('hermes/dialogueManager/endSession', JSON.stringify({
                    sessionId: message.sessionId,
                    text: "I'm afraid I didn't catch that?"
                }));
            } else {
                name = message.slots[0].value.value;
        
                console.log("[Snips Log] name: " + name);
        
                matrix.led.set("blue");
        
                client.publish('hermes/dialogueManager/continueSession', JSON.stringify({
                    sessionId: message.sessionId,
                    text: "Hello " + name + "! Would you like to play a game?"
                }));
            }
            break;

        case "hermes/intent/ishotjr:GameReply":
            if (typeof message.slots[0] === 'undefined') {
                matrix.led.set("red");
        
                client.publish('hermes/dialogueManager/endSession', JSON.stringify({
                    sessionId: message.sessionId,
                    text: "I'm afraid I didn't catch that?"
                }));
            } else {
                reply = message.slots[0].value.value;
        
                console.log("[Snips Log] reply: " + reply);
                    
                if (reply === "yes") {
                    matrix.led.set("yellow");
                    
                    client.publish('hermes/dialogueManager/continueSession', JSON.stringify({
                        sessionId: message.sessionId,
                        text: "Yay! Would you like to play shapes, or colors?"
                    }));
                } else {
                    matrix.led.set("magenta");
                            
                    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
                        sessionId: message.sessionId,
                        text: "OK! Just say my name if you change your mind later!"
                    }));
                }
            }
            break;

        default:
            matrix.led.set("red");
    
            client.publish('hermes/dialogueManager/endSession', JSON.stringify({
                sessionId: message.sessionId,
                text: "I'm sorry, but something went wrong!"
            }));
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

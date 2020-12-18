const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

var twilio = {};

twilio.sendMessage = async (to,message) => {
    return await client.messages
        .create({
            from: 'whatsapp:+14155238886',
            body: message,
            to: 'whatsapp:+' + to
        });
}

module.exports = twilio
window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
var getKeyDown = player.getKeyDown;
var keydown = player.keydown;
var keyup = player.keyup;
window.Script39 = function()
{
  const player = GetPlayer();
const notes = player.GetVar("Texteingabe") || "";

if (!notes.trim()) {
    alert("There are no notes to print.");
} else {

    const safeNotes = notes
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Petri Nets Revisited – My Notes</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    color: #173451;
                    line-height: 1.5;
                }

                h1 {
                    font-size: 28px;
                    margin-bottom: 8px;
                }

                .course {
                    color: #666;
                    margin-bottom: 35px;
                }

                .notes {
                    white-space: pre-wrap;
                    font-size: 16px;
                }
            </style>
        </head>

        <body>
            <h1>My Notes</h1>
            <div class="course">Petri Nets Revisited</div>
            <div class="notes">${safeNotes}</div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onafterprint = function () {
    printWindow.close();
};

setTimeout(() => {
    printWindow.print();
}, 250);
}
}

window.Script40 = function()
{
  const player = GetPlayer();

const page = player.GetVar("CurrentPage") || "Current page";
const notes = player.GetVar("Texteingabe") || "";

const reference = "— " + page + " —\n";

const newNotes =
    notes.trim() === ""
        ? reference
        : notes + "\n\n" + reference;

player.SetVar("Texteingabe", newNotes);
}

window.Script41 = function()
{
  const player = GetPlayer();

const type = (player.GetVar("FeedbackType") || "").trim();
const page = (player.GetVar("CurrentPage") || "").trim();
const message = (player.GetVar("FeedbackText") || "").trim();
const email = (player.GetVar("ReplyEmail") || "").trim();
const includePage = player.GetVar("IncludePage") === true;

if (!message) {

    alert("Please enter a message.");

} else {

    const subject =
        "Petri Nets Revisited – " +
        (type || "Message") +
        (includePage && page ? " – " + page : "");

    const data = {
        subject: subject,
        message: message
    };

    if (type) {
        data.type = type;
    }

    if (includePage && page) {
        data.page = page;
    }

    if (email) {
        data.email = email;
    }

    fetch("https://formspree.io/f/xeaqzyaw", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            alert("Thank you! Your message has been sent.");
        } else {
            alert("Sorry, your message could not be sent.");
        }
    })
    .catch(() => {
        alert("Sorry, your message could not be sent.");
    });
}
}

};

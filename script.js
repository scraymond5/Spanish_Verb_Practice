
"use strict";

// =====================================================
// GLOBAL VARIABLES
// =====================================================

let verbs = [];
let currentVerb = null;

let selectedChapter = 2;
let selectedLanguage = "spanish";
let selectedTense = "present";
let practiceScope = "comprehensive";

let activeInput = null;

let sessionVerbs = [];
let sessionIndex = 0;
let sessionVerbCount = 0;

let verbsAttempted = 0;
let answersGraded = 0;
let correctAnswers = 0;

let currentVerbScored = false;
let answersRevealed = false;

const MINIMUM_VERBS = 5;
const FIRST_CHAPTER = 2;
const TOTAL_CHAPTERS = 12;

const pronouns = [
    "yo",
    "tú",
    "él / ella / usted",
    "nosotros/as",
    "vosotros/as",
    "ellos / ellas / ustedes"
];

const tenseNames = {
    present: "Present",
    preterite: "Preterite",
    imperfect: "Imperfect"
};

const spanishCharacters = [
    "á", "é", "í", "ó", "ú", "ü", "ñ"
];


// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {

    const chapterSelect = document.getElementById("chapter");

    // Populate the chapter dropdown.
    for (
        let chapter = FIRST_CHAPTER;
        chapter <= TOTAL_CHAPTERS;
        chapter++
    ) {
        const option = document.createElement("option");

        option.value = chapter;
        option.textContent = `Chapter ${chapter}`;

        chapterSelect.appendChild(option);
    }

    chapterSelect.value = selectedChapter;

    createAccentButtons();
    attachEventListeners();

    try {

        const response = await fetch("verbs.json");

        if (!response.ok) {
            throw new Error("Unable to load verbs.json");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("verbs.json must contain an array.");
        }

        verbs = data;

        updateTenseOptions();
        updateVerbCount();
        updateVerbLimit();

    } catch (error) {

        console.error(error);

        document.getElementById("verbCount").textContent =
            "Unable to load the verb data.";

        document.getElementById("startBtn").disabled = true;
    }
}


// =====================================================
// EVENT LISTENERS
// =====================================================

function attachEventListeners() {

    document.getElementById("chapter")
        .addEventListener("change", event => {

            selectedChapter = Number(event.target.value);

            updateTenseOptions();
            updateVerbCount();
            updateVerbLimit();

            hidePractice();
        });

    document.querySelectorAll(
        'input[name="practiceScope"]'
    ).forEach(radio => {

        radio.addEventListener("change", event => {

            practiceScope = event.target.value;

            updateVerbCount();
            updateVerbLimit();

            hidePractice();
        });
    });

    document.querySelectorAll(
        'input[name="language"]'
    ).forEach(radio => {

        radio.addEventListener("change", event => {

            selectedLanguage = event.target.value;

            hidePractice();
        });
    });

    document.getElementById("tense")
        .addEventListener("change", event => {

            selectedTense = event.target.value;

            hidePractice();
        });

    document.getElementById("verbLimit")
        .addEventListener("input", () => {

            validateVerbLimit();
            hidePractice();
        });

    document.getElementById("startBtn")
        .addEventListener("click", startPractice);

    document.getElementById("checkBtn")
        .addEventListener("click", checkAnswers);

    document.getElementById("showBtn")
        .addEventListener("click", showAnswers);

    document.getElementById("nextBtn")
        .addEventListener("click", nextVerb);

    document.getElementById("againBtn")
        .addEventListener("click", () => {

            document.getElementById("summary").hidden = true;
            startPractice();
        });
}


// =====================================================
// PRACTICE SETTINGS
// =====================================================

function getEligibleVerbs() {

    if (practiceScope === "chapter") {

        return verbs.filter(verb =>
            Number(verb.chapter) === selectedChapter
        );
    }

    return verbs.filter(verb =>
        Number(verb.chapter) >= FIRST_CHAPTER &&
        Number(verb.chapter) <= selectedChapter
    );
}


function getAvailableTenses() {

    return [
        "present",
        "preterite",
        "imperfect"
    ];
}


function updateTenseOptions() {

    const tenseSelect = document.getElementById("tense");

    tenseSelect.innerHTML = "";

    // Individual tenses first.
    getAvailableTenses().forEach(tense => {

        const option = document.createElement("option");

        option.value = tense;
        option.textContent = tenseNames[tense];

        tenseSelect.appendChild(option);
    });

    // All Tenses last.
    const allOption = document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All Tenses";

    tenseSelect.appendChild(allOption);

    tenseSelect.value = selectedTense;
}


function getSelectedTenses() {

    if (selectedTense === "all") {
        return getAvailableTenses();
    }

    return [selectedTense];
}


function updateVerbCount() {

    const count = getEligibleVerbs().length;

    const description = practiceScope === "chapter"
        ? `in Chapter ${selectedChapter}`
        : `through Chapter ${selectedChapter}`;

    document.getElementById("verbCount").textContent =
        `${count} verbs available ${description}.`;
}


function updateVerbLimit() {

    const input = document.getElementById("verbLimit");

    const maximum = getEligibleVerbs().length;

    input.min = MINIMUM_VERBS;
    input.max = maximum;
    input.step = 1;

    if (Number(input.value) > maximum) {
        input.value = maximum;
    }

    document.getElementById("verbRange").textContent =
        `Enter between ${MINIMUM_VERBS} and ${maximum} verbs.`;

    validateVerbLimit();
}


function validateVerbLimit() {

    const input = document.getElementById("verbLimit");
    const startButton = document.getElementById("startBtn");

    const value = Number(input.value);
    const maximum = getEligibleVerbs().length;

    const valid =
        input.value.trim() !== "" &&
        Number.isInteger(value) &&
        value >= MINIMUM_VERBS &&
        value <= maximum;

    input.setCustomValidity(
        valid
            ? ""
            : `Enter a whole number between ${MINIMUM_VERBS} and ${maximum}.`
    );

    startButton.disabled = !valid;

    return valid;
}


function hidePractice() {

    document.getElementById("practice").hidden = true;
    document.getElementById("summary").hidden = true;

    activeInput = null;
}


// =====================================================
// RANDOMIZATION
// =====================================================

function shuffleArray(array) {

    // Fisher-Yates shuffle.
    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}


// =====================================================
// START PRACTICE
// =====================================================

function startPractice() {

    if (!validateVerbLimit()) {

        document.getElementById("verbLimit")
            .reportValidity();

        return;
    }

    const requested = Number(
        document.getElementById("verbLimit").value
    );

    const eligible = getEligibleVerbs();

    // Randomize without modifying the original verb data.
    const randomized = shuffleArray([...eligible]);

    sessionVerbs = randomized.slice(0, requested);

    sessionVerbCount = sessionVerbs.length;
    sessionIndex = 0;

    verbsAttempted = 0;
    answersGraded = 0;
    correctAnswers = 0;

    currentVerbScored = false;
    answersRevealed = false;

    document.getElementById("summary").hidden = true;
    document.getElementById("practice").hidden = false;

    updateStatistics();
    displayNextVerb();
}


// =====================================================
// DISPLAY VERB
// =====================================================

function displayNextVerb() {

    if (sessionIndex >= sessionVerbCount) {
        finishPractice();
        return;
    }

    currentVerb = sessionVerbs[sessionIndex];

    currentVerbScored = false;
    answersRevealed = false;
    activeInput = null;

    document.getElementById("result").textContent = "";

    document.getElementById("checkBtn").disabled = false;

    const translation =
        document.getElementById("translation");

    translation.hidden = true;
    translation.textContent = "";

    const verbPrompt =
        document.getElementById("verbPrompt");

    if (selectedLanguage === "spanish") {

        verbPrompt.textContent = currentVerb.spanish;

        translation.textContent = currentVerb.english;

    } else {

        verbPrompt.textContent = currentVerb.english;

        translation.textContent = currentVerb.spanish;
    }

    document.getElementById("verbChapter").textContent =
        `Chapter ${currentVerb.chapter}`;

    document.getElementById("progress").textContent =
        `Verb ${sessionIndex + 1} of ${sessionVerbCount}`;

    const progressBar =
        document.getElementById("progressBar");

    progressBar.max = sessionVerbCount;
    progressBar.value = sessionIndex + 1;

    createConjugationTable();
}


// =====================================================
// CREATE CONJUGATION TABLE
// =====================================================

function createConjugationTable() {

    const tableHead = document.getElementById("tableHead");
    const tableBody = document.getElementById("tableBody");

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    const selectedTenses = getSelectedTenses();

    // Create column headings.
    const headerRow = document.createElement("tr");

    const pronounHeading = document.createElement("th");

    pronounHeading.textContent = "Pronoun";
    headerRow.appendChild(pronounHeading);

    selectedTenses.forEach(tense => {

        const heading = document.createElement("th");

        heading.textContent = tenseNames[tense];

        headerRow.appendChild(heading);
    });

    tableHead.appendChild(headerRow);

    // Create six pronoun rows.
    pronouns.forEach((pronoun, pronounIndex) => {

        const row = document.createElement("tr");

        const pronounCell = document.createElement("td");

        pronounCell.textContent = pronoun;
        row.appendChild(pronounCell);

        selectedTenses.forEach(tense => {

            const cell = document.createElement("td");

            const input = document.createElement("input");

            input.type = "text";
            input.autocomplete = "off";
            input.spellcheck = false;

            input.dataset.tense = tense;
            input.dataset.index = pronounIndex;

            input.setAttribute(
                "aria-label",
                `${pronoun}, ${tenseNames[tense]}`
            );

            // Remember the selected input for accent buttons.
            input.addEventListener("focus", () => {
                activeInput = input;
            });

            // Clear old feedback when the student edits.
            input.addEventListener("input", () => {

                const feedback =
                    cell.querySelector(".feedback");

                if (feedback && !answersRevealed) {
                    feedback.textContent = "";
                }

                input.classList.remove(
                    "correct",
                    "incorrect",
                    "accent-error"
                );
            });

            // NEW: Tab and Enter navigate down columns.
            input.addEventListener(
                "keydown",
                handleConjugationNavigation
            );

            const feedback = document.createElement("span");

            feedback.className = "feedback";

            cell.appendChild(input);
            cell.appendChild(feedback);

            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    // NEW: Automatically focus the yo field.
    const firstInput =
        tableBody.querySelector("input");

    if (firstInput) {
        firstInput.focus();
    }
}


// =====================================================
// KEYBOARD NAVIGATION
// =====================================================

function handleConjugationNavigation(event) {

    // Only intercept Tab and Enter.
    if (event.key !== "Tab" && event.key !== "Enter") {
        return;
    }

    const inputs = Array.from(
        document.querySelectorAll("#tableBody input")
    );

    const currentInput = event.target;

    if (currentInput.disabled) {
        return;
    }

    const selectedTenses = getSelectedTenses();

    const currentTense = currentInput.dataset.tense;
    const currentRow = Number(currentInput.dataset.index);

    const currentColumn =
        selectedTenses.indexOf(currentTense);

    if (currentColumn === -1) {
        return;
    }

    // Position in column-first order.
    const currentPosition =
        currentColumn * pronouns.length + currentRow;

    // Shift+Tab moves backward.
    const direction =
        event.key === "Tab" && event.shiftKey
            ? -1
            : 1;

    const nextPosition = currentPosition + direction;

    // At the end, Enter stays in the last input.
    // Tab leaves the table using the normal browser behavior.
    if (
        nextPosition < 0 ||
        nextPosition >= inputs.length
    ) {

        if (event.key === "Enter") {
            event.preventDefault();
        }

        return;
    }

    const nextColumn =
        Math.floor(nextPosition / pronouns.length);

    const nextRow =
        nextPosition % pronouns.length;

    const nextTense = selectedTenses[nextColumn];

    const nextInput = inputs.find(input =>
        input.dataset.tense === nextTense &&
        Number(input.dataset.index) === nextRow
    );

    if (nextInput && !nextInput.disabled) {

        event.preventDefault();

        nextInput.focus();

        // Highlight existing text for easy correction.
        nextInput.select();
    }
}


// =====================================================
// SPANISH CHARACTER BUTTONS
// =====================================================

function createAccentButtons() {

    const container =
        document.getElementById("accentButtons");

    container.innerHTML = "";

    spanishCharacters.forEach(character => {

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = character;

        // Preserve the focus and cursor position.
        button.addEventListener("mousedown", event => {
            event.preventDefault();
        });

        button.addEventListener("click", () => {
            insertCharacter(character);
        });

        container.appendChild(button);
    });
}


function insertCharacter(character) {

    if (
        !activeInput ||
        activeInput.disabled ||
        !activeInput.isConnected
    ) {
        return;
    }

    activeInput.focus();

    const start = activeInput.selectionStart;
    const end = activeInput.selectionEnd;

    activeInput.setRangeText(
        character,
        start,
        end,
        "end"
    );

    activeInput.dispatchEvent(
        new Event("input", { bubbles: true })
    );
}


// =====================================================
// ANSWER COMPARISON
// =====================================================

function normalizeAnswer(value) {

    return String(value)
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFC")
        .replace(/\s+/g, " ");
}


function removeAccents(value) {

    return normalizeAnswer(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}


function evaluateAnswer(answer, expected) {

    const normalizedAnswer = normalizeAnswer(answer);
    const normalizedExpected = normalizeAnswer(expected);

    if (normalizedAnswer === normalizedExpected) {
        return "correct";
    }

    if (
        normalizedAnswer !== "" &&
        removeAccents(normalizedAnswer) ===
        removeAccents(normalizedExpected)
    ) {
        return "accent";
    }

    return "incorrect";
}


// =====================================================
// CHECK ANSWERS
// =====================================================

function checkAnswers() {

    if (!currentVerb || answersRevealed) {
        return;
    }

    revealTranslation();

    const inputs = document.querySelectorAll(
        "#tableBody input"
    );

    let correctThisCheck = 0;

    inputs.forEach(input => {

        const tense = input.dataset.tense;
        const index = Number(input.dataset.index);

        const expected =
            currentVerb.conjugations[tense][index];

        const result =
            evaluateAnswer(input.value, expected);

        const feedback =
            input.parentElement.querySelector(".feedback");

        input.classList.remove(
            "correct",
            "incorrect",
            "accent-error"
        );

        if (result === "correct") {

            correctThisCheck++;

            input.classList.add("correct");
            feedback.textContent = "Correct";

        } else if (result === "accent") {

            input.classList.add("accent-error");
            feedback.textContent = "Accent error";

        } else {

            input.classList.add("incorrect");
            feedback.textContent = "Incorrect";
        }
    });

    const total = inputs.length;

    document.getElementById("result").textContent =
        `${correctThisCheck} of ${total} answers correct.`;

    // Record statistics only on the first check.
    if (!currentVerbScored) {

        verbsAttempted++;

        answersGraded += total;
        correctAnswers += correctThisCheck;

        currentVerbScored = true;

        updateStatistics();
    }
}


// =====================================================
// SHOW ANSWERS
// =====================================================

function showAnswers() {

    if (!currentVerb) {
        return;
    }

    revealTranslation();

    const inputs = document.querySelectorAll(
        "#tableBody input"
    );

    inputs.forEach(input => {

        const tense = input.dataset.tense;
        const index = Number(input.dataset.index);

        const expected =
            currentVerb.conjugations[tense][index];

        const result =
            evaluateAnswer(input.value, expected);

        const feedback =
            input.parentElement.querySelector(".feedback");

        input.classList.remove(
            "correct",
            "incorrect",
            "accent-error"
        );

        if (result === "correct") {

            input.classList.add("correct");
            feedback.textContent = "Correct";

        } else {

            input.classList.add("incorrect");
            feedback.textContent = `Answer: ${expected}`;
        }

        input.disabled = true;
    });

    answersRevealed = true;
    activeInput = null;

    document.getElementById("checkBtn").disabled = true;
    document.getElementById("result").textContent =
        "Correct answers are displayed above.";
}


function revealTranslation() {

    document.getElementById("translation").hidden = false;
}


// =====================================================
// NEXT VERB
// =====================================================

function nextVerb() {

    sessionIndex++;

    if (sessionIndex >= sessionVerbCount) {

        finishPractice();

    } else {

        displayNextVerb();
    }
}


// =====================================================
// STATISTICS
// =====================================================

function getAccuracy() {

    if (answersGraded === 0) {
        return 0;
    }

    return Math.round(
        (correctAnswers / answersGraded) * 100
    );
}


function updateStatistics() {

    document.getElementById("attempts").textContent =
        verbsAttempted;

    document.getElementById("accuracy").textContent =
        `${getAccuracy()}%`;
}


// =====================================================
// PRACTICE SUMMARY
// =====================================================

function finishPractice() {

    document.getElementById("practice").hidden = true;
    document.getElementById("summary").hidden = false;

    activeInput = null;

    document.getElementById("summaryVerbs").textContent =
        `Verbs in session: ${sessionVerbCount}`;

    document.getElementById("summaryAnswers").textContent =
        `Answers graded: ${answersGraded}`;

    document.getElementById("summaryCorrect").textContent =
        `Correct answers: ${correctAnswers}`;

    document.getElementById("summaryAccuracy").textContent =
        `First-check accuracy: ${getAccuracy()}%`;
}

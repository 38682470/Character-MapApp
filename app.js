// DOM Element References
const openBtn = document.getElementById('btn-open-import-modal');
const closeBtn = document.getElementById('btn-close-modal');
const modal = document.getElementById('import-modal');
const importForm = document.getElementById('json-import-form');
const fileInput = document.getElementById('json-file-input');
const textInput = document.getElementById('json-text-input');
const errorMsg = document.getElementById('import-error');

// 1. Open Modal
openBtn.addEventListener('click', () => {
  modal.showModal();
});

// 2. Close Modal
closeBtn.addEventListener('click', () => {
  modal.close();
  resetForm();
});

// 3. Handle Form Submission & JSON Parsing
importForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.style.display = 'none';

  try {
    let parsedData = null;

    if (fileInput.files.length > 0) {
      // Read JSON from selected file
      const file = fileInput.files[0];
      const text = await file.text();
      parsedData = JSON.parse(text);
    } else if (textInput.value.trim() !== '') {
      // Read JSON from text area
      parsedData = JSON.parse(textInput.value.trim());
    } else {
      throw new Error('Please select a file or paste JSON text.');
    }

    // Pass valid JSON data to handler
    handleImportedData(parsedData);

    // Close and reset
    modal.close();
    resetForm();
  } catch (err) {
    errorMsg.textContent = `Invalid JSON: ${err.message}`;
    errorMsg.style.display = 'block';
  }
});

// 4. Custom Application Handler
function handleImportedData(data) {
  console.log('Successfully imported JSON:', data);
  alert('JSON imported successfully! Open the browser console to view the object.');
}

// 5. Reset Form State
function resetForm() {
  importForm.reset();
  errorMsg.style.display = 'none';
}

document.getElementById('submit-btn').addEventListener('click', function() {
  const jsonInput = document.getElementById('json-input').value;
  const errorMsg = document.getElementById('error-message');
  const jsonOutput = document.getElementById('json-output');

  errorMsg.textContent = '';
  jsonOutput.textContent = 'Processing...';

  let parsedData;
  try {
    parsedData = JSON.parse(jsonInput || '{ "data": [] }');
  } catch (err) {
    errorMsg.textContent = "Invalid JSON Format.";
    jsonOutput.textContent = '';
    return;
  }

  fetch('/bfhl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(parsedData)
  })
  .then(response => response.json().then(data => ({ status: response.status, body: data })))
  .then(res => {
    if (res.status !== 200) {
      errorMsg.textContent = res.body.error || 'Something went wrong';
    }
    jsonOutput.textContent = JSON.stringify(res.body, null, 2);
  })
  .catch(err => {
    errorMsg.textContent = 'Error connecting to the API.';
    jsonOutput.textContent = '';
  });
});

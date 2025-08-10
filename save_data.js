async function saveToServer(question,solution,hintResponse,uid,qid,cid,timestamp,correctAnswer) {

    const cleanCode = solution.map(line => line.trim()).filter(line => line !== '');
    const fullCode = cleanCode.join('\n');
    console.log('Received content to save:- ',question,fullCode ,hintResponse,uid,qid,cid,timestamp,correctAnswer)
    try {
      const response = await fetch('https://survey.dfki.de/quantumtutor', {
      method: 'POST',
      headers: {
              'Content-Type': 'application/json',
              'Authorization': 'mysecret123test'
      },
      body: JSON.stringify({
        "u_id": uid,
        "timestamp": timestamp,
        "Question_ID": cid,
        "question": question,
        "fullCode": fullCode,
        "hintResponse": hintResponse,
        "correctAnswer": correctAnswer
      })
      });
      console.log('Server response :-',response)
      if (!response.ok) {
        throw new Error('Error communicating with server:- ',response.status);
      }

    } catch (error) {
      console.error("Error communicating with server:", error);
    }
  }

  async function saveStartingToServer(uid,timestamp,cid) {

    console.log('Received content to save:- ',uid,timestamp,cid)
    try {
      const response = await fetch('https://survey.dfki.de/quantumtutor', {
      method: 'POST',
      headers: {
              'Content-Type': 'application/json',
              'Authorization': 'mysecret123test'
      },
      body: JSON.stringify({
        "User_ID": uid,
        "timestamp": timestamp,
        "Question_ID": cid
      })
      });
      console.log('Server response :-',response)
      if (!response.ok) {
        throw new Error('Error communicating with server:- ',response.status);
      }

    } catch (error) {
      console.error("Error communicating with server:", error);
    }


  }
  async function saveTimeSpentToServer(questionId, u_id,timeSpentMs,log)  {

    console.log('Received content to save:- ',questionId,u_id, timeSpentMs,log)
    try {
      const response = await fetch('https://survey.dfki.de/quantumtutor', {
      method: 'POST',
      headers: {
              'Content-Type': 'application/json',
              'Authorization': 'mysecret123test'
      },
      body: JSON.stringify({
        "question": questionId,
        "User ID": u_id,
        "Time Spent": timeSpentMs,
        "log": log
      })
      });
      console.log('Server response :-',response)
      if (!response.ok) {
        throw new Error('Error communicating with server:- ',response.status);
      }

    } catch (error) {
      console.error("Error communicating with server:", error);
    }


  }
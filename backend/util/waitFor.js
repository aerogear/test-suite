  const waitFor = async (check, timeout, pause = 2000) => {
  return new Promise(async (resolve, reject) => {
    let timedout = false;
    let passed = false;

    const t = setTimeout(() => {
      timedout = true;
      reject();
    }, timeout);
    
    while (!timedout && !passed) {
      await new Promise(resolve => setTimeout(resolve, pause));
      passed = await check();
    }

    clearTimeout(t);
    resolve();
  });
};

module.exports = waitFor;

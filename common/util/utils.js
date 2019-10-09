const waitFor = async (check, timeout, pause = 4000) => {
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

const randomString = () => Math.random().toString(36).substring(7);

module.exports = {
  waitFor,
  randomString
};

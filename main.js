const { Worker } = require("worker_threads");
const logUpdate = require("log-update");
require("events").EventEmitter.prototype._maxListeners = 100;

//HCM : 10.404543344158714,106.11654053906202
//test: 10.795958, 106.618704
const start_coordinates = {
  lat: 10.795958,
  long: 106.618704,
};

//HCM: 11.156072, 107.181149
//test: 10.823027, 106.662765
const finish_coordinates = {
  lat: 10.823027,
  long: 106.662765,
};

const category = 12; /**mặc định là giáo dục */
const threads = 1; /**Số lượng bình phương threads chạy - Thay đổi để tăng tốc crawl */
const outputFile = `hcm_education_2.csv`; /**Tên file xuất ra */

const d_lat = (finish_coordinates.lat - start_coordinates.lat) / threads;
const d_long = (finish_coordinates.long - start_coordinates.long) / threads;

let element_rectangle = [
  [
    { lat: start_coordinates.lat, long: start_coordinates.long },
    {
      lat: start_coordinates.lat + d_lat,
      long: start_coordinates.long + d_long,
    },
  ],
];

for (let i = 0; i < threads * threads; i++) {
  console.log({
    i: i,
    start_coordinates: element_rectangle[i][0],
    finish_coordinates: element_rectangle[i][1],
  });
  const port = new Worker(require.resolve("./worker_app.js"), {
    workerData: {
      category,
      start_coordinates: element_rectangle[i][0],
      finish_coordinates: element_rectangle[i][1],
      outputFile,
    },
  });
  port.on("message", (data) => handleMessage(data, i));
  port.on("error", (e) => console.log(e));
  port.on("exit", (code) => console.log(`Exit code: ${code}`));

  if ((i + 1) % threads !== 0) {
    if ((i + 2) % threads !== 0)
      element_rectangle.push([
        {
          lat: element_rectangle[i][0].lat,
          long: element_rectangle[i][0].long + d_long,
        },
        {
          lat: element_rectangle[i][1].lat,
          long: element_rectangle[i][1].long + d_long,
        },
      ]);
    else
      element_rectangle.push([
        {
          lat: element_rectangle[i][0].lat,
          long: element_rectangle[i][0].long + d_long,
        },
        {
          lat: element_rectangle[i][1].lat,
          long: finish_coordinates.long,
        },
      ]);
  } else {
    if (i + 1 >= threads * (threads - 1))
      element_rectangle.push([
        {
          lat: element_rectangle[i - threads + 1][0].lat + d_lat,
          long: element_rectangle[i - threads + 1][0].long,
        },
        {
          lat: finish_coordinates.lat,
          long: element_rectangle[i - threads + 1][1].long,
        },
      ]);
    else
      element_rectangle.push([
        {
          lat: element_rectangle[i - threads + 1][0].lat + d_lat,
          long: element_rectangle[i - threads + 1][0].long,
        },
        {
          lat: element_rectangle[i - threads + 1][1].lat + d_lat,
          long: element_rectangle[i - threads + 1][1].long,
        },
      ]);
  }
}

let percents = [...Array(threads * 2)].fill(0);
function handleMessage(percent, index) {
  percents[index] = percent;
  logUpdate(
    percents.map((status, i) => `Thread ${i + 1}: ${status} %`).join("\n")
  );
}

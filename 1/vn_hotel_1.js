const { Worker } = require("worker_threads");
const logUpdate = require("log-update");
require("events").EventEmitter.prototype._maxListeners = 100;

//HCM : 10.404543344158714,106.11654053906202
//test: 10.795958, 106.618704
//1: 22.857907350423993, 104.64321020200927
const start_coordinates = {
  lat: 22.857907350423993,
  long: 104.64321020200927,
};

//HCM: 11.156072, 107.181149
//test: 10.823027, 106.662765
//1: 23.34888793301606, 106.81325109163834
const finish_coordinates = {
  lat: 23.34888793301606,
  long: 106.81325109163834,
};

/**
1: restaurent
2: coffee
3: entertaiment
4: atm&bank
5: gasstation
6: hospital
7: hotel&travel
8: spa
9: store&supermarket
10: services
11: places
12: education
13: winestore
14: sport
*/
const category = 7;
const threads = 4; /**Số lượng bình phương threads chạy - Thay đổi để tăng tốc crawl */
const outputFile = `vn_education_1.csv`; /**Tên file xuất ra */
const continuous = false; /**Tiếp tục */

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
      continuous,
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

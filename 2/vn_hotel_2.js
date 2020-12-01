const { Worker } = require("worker_threads");
const logUpdate = require("log-update");
require("events").EventEmitter.prototype._maxListeners = 100;

//HCM : 10.404543344158714,106.11654053906202
//test: 10.795958, 106.618704
//1: 22.857907350423993, 104.64321020200927
//2. 22.857907350423993, 108.04590526042817
//3. 20.50098153942168, 106.5725536579463
//4. 19.035072456694454, 106.57962527007327
//5. 17.87059500178185, 108.87013087576467
//6. 15.340905609191323, 109.4553821129751
//7. 12.31679664145901, 109.25284233750911
//8. 11.06401326776402, 108.52422825492937
//9. 10.360377311574196, 106.7889765688327
//10. 10.54011246750354, 104.23637092200744
const start_coordinates = {
  lat: 22.857907350423993,
  long: 108.04590526042817,
};

//HCM: 11.156072, 107.181149
//test: 10.823027, 106.662765
//1: 23.34888793301606, 106.81325109163834
//2. 20.50098153942168, 102.10064557931051
//3. 19.035072456694454, 103.85119171540157
//4. 17.87059500178185, 104.38290892360489
//5. 15.340905609191323, 105.6093672935058
//6. 12.31679664145901, 107.29048652438634
//7. 11.06401326776402, 105.7770106909658
//8. 10.360377311574196, 104.35425865853686
//9. 8.54011246750354, 104.38472296569029
//10. 9.953655409883128, 103.82238599003524
const finish_coordinates = {
  lat: 20.50098153942168,
  long: 102.10064557931051,
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
const outputFile = `vn_hotel_1.csv`; /**Tên file xuất ra */
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

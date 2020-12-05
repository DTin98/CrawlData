const axios = require("axios");
const fs = require("fs");
const _ = require("lodash");
const { parentPort, workerData } = require("worker_threads");
const ObjectsToCsv = require("objects-to-csv");
const path = require("path");

const getData = async (
  threadIndex,
  category = 12,
  filename = "data.csv",
  start_coordinates,
  finish_coordinates,
  continuous = false
) => {
  let times = 0;

  if (
    continuous == true &&
    fs.existsSync("./log/" + filename + "_" + threadIndex + ".log")
  ) {
    log = JSON.parse(
      await fs.readFileSync(
        path.resolve(
          __dirname,
          "./log/" + filename + "_" + threadIndex + ".log"
        )
      )
    );

    start_coordinates = log.log.start_coordinates;

    finish_coordinates = log.log.finish_coordinates;

    times = log.log.times;
  }

  element_rectangle = [
    { ...start_coordinates },
    {
      lat: start_coordinates.lat + 0.001479973879312979, //lat zoom maximum
      long: start_coordinates.long + 0.0036638975143432617, //long zoom maximum
    },
  ];

  //to calculate percent of processing
  const distance_long = element_rectangle[1].long - element_rectangle[0].long;
  const distance_lat = element_rectangle[1].lat - element_rectangle[0].lat;
  const total_times =
    ((finish_coordinates.long - element_rectangle[1].long) / distance_long) *
    ((finish_coordinates.lat - element_rectangle[1].lat) / distance_lat);
  // console.log("total_times", total_times);

  const filterData = (data) => {
    return _.trim(JSON.stringify(data), "[]");
  };

  try {
    //open file
    if (times >= total_times) process.exit;
    while (
      element_rectangle[1].lat <
      finish_coordinates.lat + 0.001479973879312979
    ) {
      //Column
      let rectangle_coordinates = JSON.parse(JSON.stringify(element_rectangle));
      while (
        rectangle_coordinates[1].long <
        finish_coordinates.long + 0.0036638975143432617
      ) {
        //Row
        let baseURL = `https://map.coccoc.com/map/search.json?category=${category}&borders=${rectangle_coordinates[0].lat},${rectangle_coordinates[0].long},${rectangle_coordinates[1].lat},${rectangle_coordinates[1].long}`;
        await axios.get(baseURL, { timeout: 300000 }).then(async (res) => {
          // console.log("res", res.data);
          if (res.data.result.poi.length > 0) {
            const csv = new ObjectsToCsv(res.data.result.poi);
            await csv.toDisk(filename, { append: true });
          }
        });

        long_tmp = rectangle_coordinates[0].long;
        rectangle_coordinates[0].long = rectangle_coordinates[1].long;
        rectangle_coordinates[1].long =
          rectangle_coordinates[1].long +
          rectangle_coordinates[1].long -
          long_tmp;

        /*--log--*/
        parentPort.postMessage(
          parseFloat((times * 100) / total_times).toFixed(5)
        );
        // console.log(
        //   `\t${parseFloat((times * 100) / total_times).toFixed(
        //     5
        //   )}% . ${JSON.stringify(rectangle_coordinates)}`
        // );

        await fs.writeFileSync(
          path.resolve(
            __dirname,
            "./log/" + filename + "_" + threadIndex + ".log"
          ),
          JSON.stringify({
            log: {
              start_coordinates: element_rectangle[0],
              finish_coordinates: finish_coordinates,
              times: times,
            },
          })
        );

        times++;
      }
      lat_tmp = element_rectangle[0].lat;
      element_rectangle[0].lat = element_rectangle[1].lat;
      element_rectangle[1].lat =
        element_rectangle[1].lat + element_rectangle[1].lat - lat_tmp;
    }

    //close file
  } catch (error) {
    console.error(error);
  }
};

const {
  threadIndex,
  category,
  start_coordinates,
  finish_coordinates,
  outputFile,
  continuous,
} = workerData;
// console.log("workerData", workerData);
getData(
  threadIndex,
  category,
  outputFile,
  start_coordinates,
  finish_coordinates,
  continuous
);

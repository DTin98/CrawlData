const axios = require("axios");
const fs = require("fs");
const _ = require("lodash");
const { parentPort, workerData } = require("worker_threads");
const ObjectsToCsv = require("objects-to-csv");

const getData = async (
  category = 12,
  filename = "data.json",
  start_coordinates,
  finish_coordinates
) => {
  let times = 0;

  //HCM : 10.404543344158714,106.11654053906202,10.406023318038027,106.12020443657636
  //DN :{ lat: 15.954187385518079, long: 108.13177884012143 }
  //10.771400, 106.604236
  start_coordinates = start_coordinates || {
    lat: 10.7714,
    long: 106.604236,
  };

  //HCM: 11.156072, 107.181149
  //DN: {lat: 16.133962,long: 108.282722}
  //10.823441, 106.683367
  finish_coordinates = finish_coordinates || {
    lat: 10.823441,
    long: 106.683367,
  };

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
        await axios.get(baseURL).then(async (res) => {
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
  category,
  start_coordinates,
  finish_coordinates,
  outputFile,
} = workerData;
// console.log("workerData", workerData);
getData(category, outputFile, start_coordinates, finish_coordinates);

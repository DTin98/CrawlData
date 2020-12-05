const axios = require("axios");
const fs = require("fs");
const ObjectsToCsv = require("objects-to-csv");
const path = require("path");
const { exit } = require("process");

const getData = async (
  threadIndex,
  category = 12,
  filename = "data.csv",
  x1,
  y1,
  x2,
  y2,
  continuous
) => {
  let times = 0;

  let start_coordinates = { lat: x1, long: y1 };
  let finish_coordinates = { lat: x2, long: y2 };

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

  //10.901578594970857, 106.72479284865365, 10.90435987955874, 106.73212064368234;

  element_rectangle = [
    { ...start_coordinates },
    {
      lat: start_coordinates.lat + 10.90435987955874 - 10.901578594970857, //lat zoom maximum
      long: start_coordinates.long + 106.73212064368234 - 106.72479284865365, //long zoom maximum
    },
  ];

  //to calculate percent of processing
  const distance_long = element_rectangle[1].long - element_rectangle[0].long;
  const distance_lat = element_rectangle[1].lat - element_rectangle[0].lat;
  const total_times =
    ((finish_coordinates.long - element_rectangle[1].long) / distance_long) *
    ((finish_coordinates.lat - element_rectangle[1].lat) / distance_lat);
  // console.log("total_times", total_times);

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

          long_tmp = rectangle_coordinates[0].long;
          rectangle_coordinates[0].long = rectangle_coordinates[1].long;
          rectangle_coordinates[1].long =
            rectangle_coordinates[1].long +
            rectangle_coordinates[1].long -
            long_tmp;

          fs.writeFileSync(
            path.resolve(
              __dirname,
              "./log/" + filename + "_" + threadIndex + ".log"
            ),
            JSON.stringify({
              log: {
                start_coordinates: element_rectangle[0],
                finish_coordinates: finish_coordinates,
                times: times,
                percent: (times * 100) / total_times,
              },
            })
          );
          times++;
          console.log(
            `Thread ${threadIndex}: ${parseFloat(
              (times * 100) / total_times
            ).toFixed(2)}%`
          );
        });
      }
      lat_tmp = element_rectangle[0].lat;
      element_rectangle[0].lat = element_rectangle[1].lat;
      element_rectangle[1].lat =
        element_rectangle[1].lat + element_rectangle[1].lat - lat_tmp;
    }

    //close file
  } catch (error) {
    await fs.writeFileSync(
      path.resolve(__dirname, "./log/" + filename + "_" + threadIndex + ".log"),
      JSON.stringify({
        log: {
          start_coordinates: element_rectangle[0],
          finish_coordinates: finish_coordinates,
          times: times,
          error: error,
        },
      })
    );
  }
};

const threadIndex = parseInt(process.argv.slice(2)[0]);
const category = parseInt(process.argv.slice(2)[1]);
const outputFile = process.argv.slice(2)[2];
const x1 = parseFloat(process.argv.slice(2)[3]);
const y1 = parseFloat(process.argv.slice(2)[4]);
const x2 = parseFloat(process.argv.slice(2)[5]);
const y2 = parseFloat(process.argv.slice(2)[6]);
const continuous = parseInt(process.argv.slice(2)[7]);

getData(threadIndex, category, outputFile, x1, y1, x2, y2, continuous);

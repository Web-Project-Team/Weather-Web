// firebase error 처리
document.addEventListener("DOMContentLoaded", function () {
  try {
    let app = firebase.app();
    let features = ["auth", "database", "messaging", "storage"].filter(
      (feature) => typeof app[feature] === "function"
    );
  } catch (e) {
    console.error(e);
  }
});

var latitude = 0;
var longitude = 0;

// 사용자 위치검색
function geoFindMe() {
  function success(position) {
    const _latitude = position.coords.latitude;
    const _longitude = position.coords.longitude;

    latitude = _latitude;
    longitude = _longitude;

    // 마커 표시
    var marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(_latitude, _longitude),
      // position: new naver.maps.LatLng(37.4652876, 126.900341),
      map: map,
    });
    console.log("marker Address : ", _latitude, _longitude);
  }

  function error() {
    console.log("Unable to retrieve your location");
  }

  if (!navigator.geolocation) {
    console.log("Geolocation is not supported by your browser");
  } else {
    console.log("Locating");
    navigator.geolocation.getCurrentPosition(success, error);
  }
}
geoFindMe();
// console.log("address : ", latitude, longitude);

//  Naver Map API
var map = new naver.maps.Map("map", {
  center: new naver.maps.LatLng(37.4652876, 126.900341),
  // center: new naver.maps.LatLng(latitude, longitude),
  zoom: 15,
  mapTypeControl: true,
});

console.log("Address : ", latitude, longitude);

var infoWindow = new naver.maps.InfoWindow({
  anchorSkew: true,
});

map.setCursor("pointer");

function searchCoordinateToAddress(latlng) {
  infoWindow.close();

  naver.maps.Service.reverseGeocode(
    {
      coords: latlng,
      orders: [
        naver.maps.Service.OrderType.ADDR,
        naver.maps.Service.OrderType.ROAD_ADDR,
      ].join(","),
    },
    function (status, response) {
      if (status === naver.maps.Service.Status.ERROR) {
        if (!latlng) {
          return alert("ReverseGeocode Error, Please check latlng");
        }
        if (latlng.toString) {
          return alert("ReverseGeocode Error, latlng:" + latlng.toString());
        }
        if (latlng.x && latlng.y) {
          return alert(
            "ReverseGeocode Error, x:" + latlng.x + ", y:" + latlng.y
          );
        }
        return alert("ReverseGeocode Error, Please check latlng");
      }

      var address = response.v2.address,
        htmlAddresses = [];

      if (address.jibunAddress !== "") {
        htmlAddresses.push("[지번 주소] " + address.jibunAddress);
      }

      if (address.roadAddress !== "") {
        htmlAddresses.push("[도로명 주소] " + address.roadAddress);
      }

      infoWindow.setContent(
        [
          '<div style="padding:10px;min-width:200px;line-height:150%;">',
          '<h4 style="margin-top:5px;">검색 좌표</h4><br />',
          htmlAddresses.join("<br />"),
          "</div>",
        ].join("\n")
      );

      infoWindow.open(map, latlng);
    }
  );
}

function searchAddressToCoordinate(address) {
  naver.maps.Service.geocode(
    {
      query: address,
    },
    function (status, response) {
      if (status === naver.maps.Service.Status.ERROR) {
        if (!address) {
          return alert("Geocode Error, Please check address");
          // return console.log("status : ", status);
        }
        return alert("Geocode Error, address:" + address);
        // return console.log("Geocode Error, address:" + address);
      }

      if (response.v2.meta.totalCount === 0) {
        return alert("No result.");
      }

      var htmlAddresses = [],
        item = response.v2.addresses[0],
        point = new naver.maps.Point(item.x, item.y);
      latitude = item.x;
      longitude = item.y;

      if (item.roadAddress) {
        htmlAddresses.push("[도로명 주소] " + item.roadAddress);
      }

      if (item.jibunAddress) {
        htmlAddresses.push("[지번 주소] " + item.jibunAddress);
      }

      // if (item.englishAddress) {
      //   htmlAddresses.push("[영문명 주소] " + item.englishAddress);
      // }

      infoWindow.setContent(
        [
          '<div style="padding:10px;min-width:200px;line-height:150%; ">',
          '<h4 style="margin-top:5px;">검색 주소 : ' + address + "</h4><br />",
          htmlAddresses.join("<br />"),
          "</div>",
        ].join("\n")
      );

      map.setCenter(point);
      infoWindow.open(map, point);
    }
  );
}

function initGeocoder() {
  if (!map.isStyleMapReady) {
    return;
  }

  map.addListener("click", function (e) {
    searchCoordinateToAddress(e.coord);
    realTimeWeather(latitude, longitude);
    console.log("address click : ", latitude, longitude);
  });

  $("#address").on("keydown", function (e) {
    var keyCode = e.which;

    if (keyCode === 13) {
      // Enter Key
      searchAddressToCoordinate($("#address").val());
      realTimeWeather(latitude, longitude);
    }
  });

  $("#submit").on("click", function (e) {
    e.preventDefault();

    searchAddressToCoordinate($("#address").val());
    realTimeWeather(latitude, longitude);
  });
  // 초깃값 설정
  searchAddressToCoordinate("독산로 50길 23");
  // realTimeWeather(latitude, longitude);
  realTimeWeather(37.4652876, 126.900341);
  // 독산로 50
}

naver.maps.onJSContentLoaded = initGeocoder;
naver.maps.Event.once(map, "init_stylemap", initGeocoder);

// 날씨 API

// 기상청 격자 <-> 위도 경도 변환
//<!--
//
// LCC DFS 좌표변환을 위한 기초 자료
//
var RE = 6371.00877; // 지구 반경(km)
var GRID = 5.0; // 격자 간격(km)
var SLAT1 = 30.0; // 투영 위도1(degree)
var SLAT2 = 60.0; // 투영 위도2(degree)
var OLON = 126.0; // 기준점 경도(degree)
var OLAT = 38.0; // 기준점 위도(degree)
var XO = 43; // 기준점 X좌표(GRID)
var YO = 136; // 기1준점 Y좌표(GRID)
//
// LCC DFS 좌표변환 ( code : "toXY"(위경도->좌표, v1:위도, v2:경도), "toLL"(좌표->위경도,v1:x, v2:y) )
//

function dfs_xy_conv(code, v1, v2) {
  var DEGRAD = Math.PI / 180.0;
  var RADDEG = 180.0 / Math.PI;

  var re = RE / GRID;
  var slat1 = SLAT1 * DEGRAD;
  var slat2 = SLAT2 * DEGRAD;
  var olon = OLON * DEGRAD;
  var olat = OLAT * DEGRAD;

  var sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  var sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  var ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);
  var rs = {};
  if (code == "toXY") {
    rs["lat"] = v1;
    rs["lng"] = v2;
    var ra = Math.tan(Math.PI * 0.25 + v1 * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    var theta = v2 * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;
    rs["x"] = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    rs["y"] = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  } else {
    rs["x"] = v1;
    rs["y"] = v2;
    var xn = v1 - XO;
    var yn = ro - v2 + YO;
    ra = Math.sqrt(xn * xn + yn * yn);
    if (sn < 0.0) -ra;
    var alat = Math.pow((re * sf) / ra, 1.0 / sn);
    alat = 2.0 * Math.atan(alat) - Math.PI * 0.5;

    if (Math.abs(xn) <= 0.0) {
      theta = 0.0;
    } else {
      if (Math.abs(yn) <= 0.0) {
        theta = Math.PI * 0.5;
        if (xn < 0.0) -theta;
      } else theta = Math.atan2(xn, yn);
    }
    var alon = theta / sn + olon;
    rs["lat"] = alat * RADDEG;
    rs["lng"] = alon * RADDEG;
  }
  return rs;
}

function realTimeWeather(latitude, longitude) {
  // console.log("weather api");
  // 좌표 -> 위치 변환
  var weatherAddress = dfs_xy_conv("toXY", 37.4652876, 126.900341);
  // var weatherAddress = dfs_xy_conv("toXY", latitude, longitude);

  var today = new Date();
  var week = new Array("일", "월", "화", "수", "목", "금", "토");
  var year = today.getFullYear();
  var month = today.getMonth() + 1;
  var day = today.getDate();
  var hours = today.getHours();
  var minutes = today.getMinutes();

  $(".weather-date").html(
    month + "월 " + day + "일 " + week[today.getDay()] + "요일"
  );

  /*
   * 기상청 30분마다 발표
   * 30분보다 작으면, 한시간 전 hours 값
   */
  if (minutes < 30) {
    hours = hours - 1;
    if (hours < 0) {
      // 자정 이전은 전날로 계산
      today.setDate(today.getDate() - 1);
      day = today.getDate();
      month = today.getMonth() + 1;
      year = today.getFullYear();
      hours = 23;
    }
  }

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (month < 10) {
    month = "0" + month;
  }
  if (day < 10) {
    day = "0" + day;
  }

  $("#weather-address").textContent = $("#address").val();
  today = year + "" + month + "" + day;

  /* 좌표 */
  var _nx = weatherAddress.lat,
    _ny = weatherAddress.lng,
    apikey =
      "uKiB5qvKJFlNfc9dwzQJ0uNgc%2B8bgCMhhXlxWTUCPmGYyn51uLm2YGW4uZp1a8eJSnONwUWcxNqq0YSCaS645w%3D%3D",
    ForecastGribURL =
      "http://apis.data.go.kr/1360000/VilageFcstInfoService/getUltraSrtFcst";
  // "http://newsky2.kma.go.kr/service/SecndSrtpdFrcstInfoService2/ForecastGrib";
  ForecastGribURL += "?ServiceKey=" + apikey;
  ForecastGribURL += "&base_date=" + today;
  ForecastGribURL += "&base_time=" + hours + "00";
  ForecastGribURL += "&nx=" + _nx + "&ny=" + _ny;
  ForecastGribURL += "&pageNo=1&numOfRows=7";
  ForecastGribURL += "&_type=json";

  $.ajax({
    url: ForecastGribURL,
    type: "get",
    success: function (msg) {
      var text = msg.responseText,
        text = text.replace(/(<([^>]+)>)/gi, "");
      text = "[" + text + "]";
      var json = $.parseJSON(text);

      var rain_state = json[0].response.body.items.item[1].obsrValue;
      var rain = json[0].response.body.items.item[3].obsrValue;
      var sky = json[0].response.body.items.item[4].obsrValue;
      var temperature = json[0].response.body.items.item[5].obsrValue;

      $(".weather-temp").html(temperature.toFixed(1) + " ℃");
      $("#RN1").html("시간당강수량 : " + rain + "mm");

      if (rain_state != 0) {
        switch (rain_state) {
          case 1:
            $(".weather-state-text").html("비");
            break;
          case 2:
            $(".weather-state-text").html("비/눈");
            break;
          case 3:
            $(".weather-state-text").html("눈");
            break;
        }
      } else {
        switch (sky) {
          case 1:
            $(".weather-state-text").html("맑음");
            break;
          case 2:
            $(".weather-state-text").html("구름조금");
            break;
          case 3:
            $(".weather-state-text").html("구름많음");
            break;
          case 4:
            $(".weather-state-text").html("흐림");
            break;
        }
      }
    },
  });
}

// realTimeWeather();

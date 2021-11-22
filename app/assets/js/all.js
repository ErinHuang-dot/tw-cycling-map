// 載入 mapbox
const mymap = L.map('bikeMap').setView([24.137407449737076, 120.68691963575823], 13);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiZXJpbmh1YW5nIiwiYSI6ImNrdmkzY3ByOTF2ajAzMHFmMjlqNmFsMDgifQ.TkoOhH9ZSuXuwKRz2XG0Rg'
}).addTo(mymap);

// 使用 navigator web api 取得使用者裝置位置
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
      function(position) {
          const longitude = position.coords.longitude;
          const latitude = position.coords.latitude;
          // console.log(longitude);
          // console.log(latitude); 裝置會跳視窗 "XX網只想知道你在的位置"
          
          // 重新設定 view 的位置
          mymap.setView([latitude, longitude], 13)
          //將經緯度當作參數傳給 getData 執行
          getSationData(longitude, latitude);
      },
      // 錯誤訊息
      function(e) {
          const msg = e.code;
          const dd = e.message;
          console.log(msg);
          console.log(dd);
      }
  )
}

// TDX API 驗證
function GetAuthorizationHeader() {
  var AppID = 'f7c6d9e58f254fe5af3cd8ee9794906d';
  var AppKey = '6lFzrDFGOczHY42h-Erlj21ftOo';

  var GMTString = new Date().toGMTString();
  var ShaObj = new jsSHA('SHA-1', 'TEXT');
  ShaObj.setHMACKey(AppKey, 'TEXT');
  ShaObj.update('x-date: ' + GMTString);
  var HMAC = ShaObj.getHMAC('B64');
  var Authorization = 'hmac username=\"' + AppID + '\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"' + HMAC + '\"';

  return { 'Authorization': Authorization, 'X-Date': GMTString /*,'Accept-Encoding': 'gzip'*/ }; //如果要將js運行在伺服器，可額外加入 'Accept-Encoding': 'gzip'，要求壓縮以減少網路傳輸資料量
}

// 串接附近的自行車租借站位資料
let data = [];
function getSationData(longitude, latitude) {
    axios({
        method: 'get',
        url: `https://ptx.transportdata.tw/MOTC/v2/Bike/Station/NearBy?$spatialFilter=nearby(${latitude},${longitude},500)`,
        headers: GetAuthorizationHeader()        
    })
        .then((response) => {
            console.log('租借站位資料', response)
            data = response.data;

            getAvailableData(longitude, latitude);
        })
        .catch((error) => console.log('error', error))
}

// 串接附近的即時車位資料
let filterData = [];
function getAvailableData(longitude, latitude) {
    axios({
        method: 'get',
        url: `https://ptx.transportdata.tw/MOTC/v2/Bike/Availability/NearBy?$spatialFilter=nearby(${latitude},${longitude},500&$format=JSON`,
        headers: GetAuthorizationHeader()
    })
    .then((response) => {
        console.log('車位資料', response)
        const availableData =  response.data;

        // 比對站位和即時車位資料
        availableData.forEach((availableItem) => {
            data.forEach((stationItem) => {
                if (availableItem.StationUID === stationItem.StationUID) {
                    availableItem.StationName = stationItem.StationName
                    availableItem.StationAddress = stationItem.StationAddress
                    availableItem.StationPosition = stationItem.StationPosition
                    filterData.push(availableItem)
                }
            })
        })
        console.log('filterData', filterData)

        setMarker();
    })
    .catch((error) => console.log('error', error))
}

// default:rent-mode-icon
function setMarker() {
    filterData.forEach((item) => {

        let rentIcon = L.icon ({
            iconUrl: '../assets/images/map_rent-mode-shadow.svg',
            iconSize: [54,54],
            iconAnchor: [70,50],
            popupAnchor:  [-45, -50]
        })

        L.marker([item.StationPosition.PositionLat, item.StationPosition.PositionLon], {icon :rentIcon}).addTo(mymap).bindPopup(
          `
            <div class="rent-card card">
                <div class="card-body p-0">
                    <div class="d-flex align-items-center mb-2">
                        <span class="card-tag card-tag-1 me-1">正常營運</span>
                        <a class="ms-auto" href="/" title="分享此站點"><img src="./assets/images/share.svg" alt=""></a>
                    </div>
                    <h4 class="card-title">${item.StationName.Zh_tw}</h4>
                    <p class="card-subtitle fs-6 text-muted mb-2">${item.StationAddress.Zh_tw}</p>
                    <p class="card-text fs-6">可租借數量 <span class="fs-4">${item.AvailableRentBikes}</span> 輛</p>
                </div>
            </div>
          `
      )
  })
}
// switch control + custom icon + binPopup
const switchMode = document.querySelector('#switchMode');
switchMode.addEventListener('change', (e) =>{
    if (e.target.checked) {
        filterData.forEach((item) => {

            let returnIcon = L.icon ({
                iconUrl: '../assets/images/map_return-mode-shadow.svg',
                iconSize: [54,54],
                iconAnchor: [70,50],
                popupAnchor:  [-45, -50]
            })
    
            L.marker([item.StationPosition.PositionLat, item.StationPosition.PositionLon], {icon :returnIcon}).addTo(mymap).bindPopup(
              `
                <div class="return-card card">
                    <div class="card-body p-0">
                        <div class="d-flex align-items-center mb-2">
                            <span class="card-tag card-tag-1 me-1">正常營運</span>
                            <a class="ms-auto" href="/" title="分享此站點"><img src="./assets/images/share.svg" alt=""></a>
                        </div>
                        <h4 class="card-title">${item.StationName.Zh_tw}</h4>
                        <p class="card-subtitle fs-6 text-muted mb-2">${item.StationAddress.Zh_tw}</p>
                        <p class="card-text fs-6">可歸還數量 <span class="fs-4">${item.AvailableReturnBikes}</span> 輛</p>
                    </div>
                </div>
              `
          )
      })
    } else {
        setMarker(); // 如果已選地標不會及時切換
    }
})


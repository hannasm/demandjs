(function() {
  window.test_images = [
    'https://images.unsplash.com/photo-1422433555807-2559a27433bd',
    'https://images.unsplash.com/photo-1467780839816-65e92876c0bd',
    'https://images.unsplash.com/photo-1466096115517-bceecbfb6fde',
    'https://images.unsplash.com/photo-1448697138198-9aa6d0d84bf4',
    'https://images.unsplash.com/photo-1448932223592-d1fc686e76ea',
    'https://images.unsplash.com/photo-1441338167148-d09eab9deed6',
    'https://images.unsplash.com/photo-1465224414649-ceb7f1db3999',
    'https://images.unsplash.com/photo-1462530260150-162092dbf011',
    'https://images.unsplash.com/photo-1472228283686-42356d789f66',
    'https://images.unsplash.com/photo-1457694716743-eb419114c894',
    'https://images.unsplash.com/1/bag-and-hands.jpg?auto=format&',
    'https://images.unsplash.com/photo-1433477194723-29c0d6a29478',
    'https://images.unsplash.com/photo-1461548273295-e484210f2c91',
    'https://images.unsplash.com/photo-1451933371645-a3029668b979',
    'https://images.unsplash.com/photo-1444069788560-6ae1deb4c0d4',
    'https://images.unsplash.com/photo-1441448770220-76743f9e6af6',
    'https://images.unsplash.com/photo-1456324504439-367cee3b3c32',
    'https://images.unsplash.com/photo-1455849318743-b2233052fcff',
    'https://images.unsplash.com/photo-1417721955552-a49ac2d334e8',
    'https://images.unsplash.com/photo-1468174482686-1047396f13b3',
    'https://images.unsplash.com/photo-1444676632488-26a136c45b9b',
    'https://images.unsplash.com/photo-1468343966296-e9b4b71804ff',
    'https://images.unsplash.com/photo-1470214203634-e436a8848e23',
    'https://images.unsplash.com/photo-1444201983204-c43cbd584d93',
    'https://images.unsplash.com/photo-1430928550889-b8cc7455924c',
    'https://images.unsplash.com/photo-1452941813770-76fb5b3a1e3f',
    'https://images.unsplash.com/photo-1425315283416-2acc50323ee6',
    'https://images.unsplash.com/photo-1452993912631-49cff82efb5e',
    'https://images.unsplash.com/photo-1437419764061-2473afe69fc2'
  ];

  window.test_videos = [
    'https://wedistill.io/uploads/videos/processed/1716/Northernlights2_HD.mp4.mp4',
    'https://wedistill.io/uploads/videos/processed/33/Cold2520Winter2520Dream-HD3_1.mp4.mp4',
    'https://wedistill.io/uploads/videos/processed/1637/flow_in_the_sky.mp4',
    'https://wedistill.io/uploads/videos/processed/34/State-Fair-2013-HD.mp4.mp4',
    'https://wedistill.io/uploads/videos/processed/757/girlbythesea.mp4.mp4',
    'https://wedistill.io/uploads/videos/processed/803/citylifestyle.mp4.mp4'
  ];
  window.error_images=[];
  for (var i = 0;  i < window.test_images.length; i++) {
    window.error_images.push(window.test_images[i].replace('images', 'doesnotexist'));
  }
  window.test_image_suffixes = {
    'small': '?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&s=f82c1b2283e2d580a6dc4fb3705b2c79',
    'thumb': '?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=200&fit=max&s=30eb50a990275971a8e9f9e2c7b87764',
    'regular': '?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&s=feccda0a0a589cf0b24ec143095d0216',
    'full': '?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=2e1e98c6d421d86b27c2fcc0f39f4abd'
  };

  window.test_images_cite = 'https://unsplash.com/collections/330408/in-demand';
}
)();

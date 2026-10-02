fetch('http://localhost:3000/cctv/video1.mp4', { method: 'HEAD' })
  .then(res => console.log('Video 1 Status:', res.status, res.headers.get('content-type')))
  .catch(err => console.error(err));

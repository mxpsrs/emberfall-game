# Earlier rendering baseline

These are actual production-Filament browser captures of checkpoint
`2ea45c72ed0b545a45329d1a53b6a93a1bd7b3f9`, rendered locally with a disposable
account. They use 1920 × 1080, device scale 1, world hour 11, and the route
coordinates, yaw, pitch, and zoom recorded in `result.json.gz`.

The original captures did not wait for all loading and visible construction
to finish. They document the earlier appearance, but cannot establish a
settled frame-rate baseline. Final captures explicitly wait for those queues
and record 120 subsequent frames per view. Software-GPU measurements do not
certify desktop or physical-phone performance.

JPEGs are exports of those actual screenshots. The compressed JSON preserves
the original receipt and samples without dropping fields.

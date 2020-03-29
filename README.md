# stagefright

Jam with other musicians in realtime using [WebRTC][] and [Web MIDI][]

## features

- Hear and mix audio from all sources dynamically
- Synchronize MIDI devices over the network with MTC

## installation

Clone this repo:

    git clone https://github.com/tubbo/stagefright.git

Install dependencies:

    yarn install

Run the development server:

    yarn start

View the app at <http://localhost:1337>

## usage

Go to https://tubbo-stagefright.herokuapp.com and allow audio/MIDI
permissions, then start jamming! It's all one big room for now.

## deployment

This app is deployed to [Heroku][] using a [Docker][] image.

To deploy the application, first build the Docker image:

    docker build . -t tubbo-stagefright/web

Then, push the image to Heroku:

    docker push registry.heroku.com/tubbo-stagefright/web

Finally, run this command to create a new release:

    heroku container:release web

[WebRTC]: https://www.w3.org/TR/webrtc/
[Web MIDI]: https://www.w3.org/TR/webmidi/
[Heroku]: https://heroku.com
[Docker]: https://docker.com

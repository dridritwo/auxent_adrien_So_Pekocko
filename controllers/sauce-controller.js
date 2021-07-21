const Sauce = require("../models/Sauce");
const fs = require("fs");
var https = require("follow-redirects").https;
const path = require("path");
const agent = require("superagent");
const imageToBase64 = require("image-to-base64");

exports.createSauce = (req, res, next) => {
  imageToBase64(req.file.path)
    .then((response) => {
      console.log(response); // "cGF0aC90by9maWxlLmpwZw=="

      var options = {
        method: "POST",
        hostname: "api.imgur.com",
        path: "/3/image",
        headers: {
          Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        },
        maxRedirects: 20,
      };

      var req = https.request(options, function (res) {
        var chunks = [];

        res.on("data", function (chunk) {
          chunks.push(chunk);
        });

        res.on("end", function (chunk) {
          var body = Buffer.concat(chunks);
          console.log(body.toString());
        });

        res.on("error", function (error) {
          console.error(error);
        });
      });

      var postData =
        '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="image"\r\n\r\nR0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--';

      req.setHeader(
        "content-type",
        "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW"
      );

      req.write(postData);

      req.end();
    })
    .catch((error) => {
      console.log(error); // Logs an error if there was one
    });
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  const sauce = new Sauce({
    ...sauceObject,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
    usersLiked: [],
    usersDisLiked: [],
    likes: 0,
    dislikes: 0,
  });
  sauce
    .save()
    .then(() => res.status(201).json({ message: "Objet enregistré !" }))
    .catch((error) => res.status(400).json({ error }));
};

exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(404).json({ error }));
};

exports.modifySauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      const filename = sauce.imageUrl.split("/images/")[1];
      fs.unlink(`images/${filename}`, () => {
        const sauceObject = req.file
          ? {
              ...JSON.parse(req.body.sauce),
              imageUrl: `${req.protocol}://${req.get("host")}/images/${
                req.file.filename
              }`,
            }
          : { ...req.body };
        Sauce.updateOne(
          { _id: req.params.id },
          { ...sauceObject, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Objet modifié !" }))
          .catch((error) => res.status(400).json({ error }));
      });
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      const filename = sauce.imageUrl.split("/images/")[1];
      fs.unlink(`images/${filename}`, () => {
        Sauce.deleteOne({ _id: req.params.id })
          .then(() => res.status(200).json({ message: "Objet supprimé !" }))
          .catch((error) => res.status(400).json({ error }));
      });
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.getAllSauce = (req, res, next) => {
  Sauce.find()
    .then((sauces) => res.status(200).json(sauces))
    .catch((error) => res.status(400).json({ error }));
};

exports.likeSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (req.body.like === 1 && !sauce.usersLiked.includes(req.body.userId)) {
        sauce.usersLiked.push(req.body.userId);
        sauce.likes += 1;
      }
      if (req.body.like === 0) {
        if (sauce.usersLiked.includes(req.body.userId)) {
          sauce.usersLiked = sauce.usersLiked.filter(
            (user) => user !== req.body.userId
          );
          sauce.likes -= 1;
        }
        if (sauce.usersDisliked.includes(req.body.userId)) {
          sauce.usersDisliked = sauce.usersDisliked.filter(
            (user) => user !== req.body.userId
          );
          sauce.dislikes -= 1;
        }
      }
      if (
        req.body.like === -1 &&
        !sauce.usersDisliked.includes(req.body.userId)
      ) {
        sauce.usersDisliked.push(req.body.userId);
        sauce.dislikes += 1;
      }
      Sauce.updateOne(
        { _id: req.params.id },
        {
          $set: {
            usersLiked: sauce.usersLiked,
            usersDisliked: sauce.usersDisliked,
            likes: sauce.likes,
            dislikes: sauce.dislikes,
          },
        }
      )
        .then(() => res.status(200).json({ message: "Objet modifié !" }))
        .catch((error) => res.status(400).json({ error }));
    })
    .catch((error) => res.status(400).json({ error }));
};

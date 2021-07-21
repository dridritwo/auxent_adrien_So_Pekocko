const Sauce = require("../models/Sauce");
const fs = require("fs");
var https = require("follow-redirects").https;
const path = require("path");
const agent = require("superagent");
var request = require("request");
const imageToBase64 = require("image-to-base64");

exports.createSauce = (req, res, next) => {
  imageToBase64(req.file.path)
    .then((image64) => {
      var options = {
        method: "POST",
        url: "https://api.imgur.com/3/image",
        headers: {
          Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        },
        formData: {
          image: image64,
        },
      };
      request(options, function (error, responseImgur) {
        if (error) throw new Error(error);
        const sauceObject = JSON.parse(req.body.sauce);
        delete sauceObject._id;
        const sauce = new Sauce({
          ...sauceObject,
          imageUrl: JSON.parse(responseImgur.body).data.link,
          imageDeleteHash: JSON.parse(responseImgur.body).data.deletehash,
          usersLiked: [],
          usersDisLiked: [],
          likes: 0,
          dislikes: 0,
        });
        sauce
          .save()
          .then(() => {
            fs.unlink(req.file.path, () => {});
            res.status(201).json({ message: "Objet enregistré !" });
          })
          .catch((error) => res.status(400).json({ error }));
      });
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(404).json({ error }));
};

exports.modifySauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      // delete imgur image
      if (req.file) {
      var options = {
        method: "DELETE",
        url: `https://api.imgur.com/3/image/${sauce.imageDeleteHash}`,
        headers: {
          Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        },
        formData: {},
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
        // upload imgur image if there is an image to change
        imageToBase64(req.file.path)
          .then((image64) => {
            // unlink image
            fs.unlink(req.file.path, () => {});
            var options = {
              method: "POST",
              url: "https://api.imgur.com/3/image",
              headers: {
                Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
              },
              formData: {
                image: image64,
              },
            };
            request(options, function (error, responseImgur) {
              if (error) throw new Error(error);
              // mofify URL in MongoDB

              // modifier
              const sauceObject = req.file
                ? {
                    ...JSON.parse(req.body.sauce),
                    imageUrl: JSON.parse(responseImgur.body).data.link,
                    imageDeleteHash: JSON.parse(responseImgur.body).data
                      .deletehash,
                  }
                : { ...req.body };
              Sauce.updateOne(
                { _id: req.params.id },
                { ...sauceObject, _id: req.params.id }
              )
                .then(() =>
                  res.status(200).json({ message: "Objet modifié !" })
                )
                .catch((error) => res.status(400).json({ error }));
            });
          })
          .catch((error) => res.status(500).json({ error }));
        });
      } else  {
        // modifier
        const sauceObject = { ...req.body };
      Sauce.updateOne(
        { _id: req.params.id },
        { ...sauceObject, _id: req.params.id }
      )
        .then(() =>
          res.status(200).json({ message: "Objet modifié !" })
        )
        .catch((error) => res.status(400).json({ error }));
      }
    })
    .catch((error) => res.status(500).json({ error }));
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      var options = {
        method: "DELETE",
        url: `https://api.imgur.com/3/image/${sauce.imageDeleteHash}`,
        headers: {
          Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        },
        formData: {},
      };
      request(options, function (error, response) {
        if (error) throw new Error(error);
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

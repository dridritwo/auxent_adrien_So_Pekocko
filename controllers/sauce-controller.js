const Sauce = require("../models/sauce");
const fs = require("fs");

exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  console.log("sauce created : ", sauceObject)
  delete sauceObject._id;
  const sauce = new Sauce({
    ...sauceObject,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
    usersLiked: [],
    usersDisLiked: [],
    likes: 0,
    dislikes: 0
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
  console.log("modify req body", req.body)
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
    Sauce.findOne({_id: req.params.id})
      .then((sauce) => {
        if (req.body.like === 1 && !sauce.usersLiked.includes(req.body.userId)) {
          sauce.usersLiked.push(req.body.userId)
          sauce.likes += 1;
        }
        if (req.body.like === 0) {
          if (sauce.usersLiked.includes(req.body.userId)) {
            sauce.usersLiked = sauce.usersLiked.filter((user) => user !== req.body.userId)
            sauce.likes -= 1;
          }
          if (sauce.usersDisliked.includes(req.body.userId)) {
            sauce.usersDisliked = sauce.usersDisliked.filter((user) => user !== req.body.userId)
            sauce.dislikes -= 1;
          }
        }
        if (req.body.like === -1 && !sauce.usersDisliked.includes(req.body.userId)) {
          sauce.usersDisliked.push(req.body.userId)
          sauce.dislikes += 1;
        }
        Sauce.updateOne(
          { _id: req.params.id },
          {
            $set: {
              usersLiked: sauce.usersLiked,
              usersDisliked: sauce.usersDisliked,
              likes: sauce.likes,
              dislikes: sauce.dislikes
            }
          }
          )
          .then(() => res.status(200).json({ message: "Objet modifié !" }))
          .catch((error) => res.status(400).json({ error }));
        })
      .catch((error) => res.status(400).json({ error }));
  };


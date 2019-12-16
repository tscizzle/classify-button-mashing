# why is this import broken? put button_mash_classifier.py in here if needed
from button_mash_classifier import ButtonMashClassifier


def main():
    pre_inps = open("button_mashes_pre.data").readlines()
    tyler_inps = open("button_mashes_tyler.data").readlines()
    all_inps = pre_inps + tyler_inps
    all_labels = ["pre" for _ in pre_inps] + ["tyler" for _ in tyler_inps]

    bmc = ButtonMashClassifier(all_inps, all_labels)

    """
    example:
    ```
    bmc.predict(["erflkewxq;", "wpfoijcwqodlcwqk"])
    ```
    """
    print("butt")

    return


if __name__ == "__main__":
    main()
